import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import nodemailer from "nodemailer";
import { getAuth0AccessToken } from "./auth0.js";

const app = express();
const port = 3001; // Port number for the server

const corsOptions = {
  origin: "http://localhost:3000",
};

app.use(cors(corsOptions));
app.use(express.json());

const exportDashboard = async (url) => {
  const accessToken = await getAuth0AccessToken();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    Authorization: `Bearer ${accessToken}`,
  });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });
  await page.emulateMediaType("screen");

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();
  return pdfBuffer;
};

const transporter = nodemailer.createTransport({
  host: process.env.SENDGRID_HOST,
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
  from: process.env.SENDGRID_SENDER_EMAIL,
});

app.post("/export", async (req, res) => {
  const body = req.body;
  const dashboardUrl = body?.dashboardUrl;
  if (!dashboardUrl) {
    return res.status(400).send("Please provide a valid URL");
  }

  const pdfBuffer = await exportDashboard(dashboardUrl);

  const buffer = Buffer.from(pdfBuffer);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="file.pdf"',
    "Content-Length": buffer.length,
  });

  res.send(buffer);
});

app.post("/send-email", async (req, res) => {
  const body = req.body;
  const email = body?.email;
  if (!email) {
    return res.status(400).send("Please provide an email");
  }

  const dashboardUrl = body?.dashboardUrl;
  if (!dashboardUrl) {
    return res.status(400).send("Please provide a valid URL");
  }
  const pdfBuffer = await exportDashboard(dashboardUrl);

  const info = await transporter.sendMail({
    from: `Alex Martinez <${process.env.SENDGRID_SENDER_EMAIL}>`,
    to: email,
    subject: "Data Insight Report",
    text: "Hi,\nThis is the data insight report.\nBest.",
    html: "<p>Hi</p><p>This is the data insight report</p><p>Best.</p>", // html body
    attachments: [
      {
        filename: "file.pdf",
        content: pdfBuffer,
      },
    ],
  });

  res.send(`Message sent: ${info.messageId}`);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
