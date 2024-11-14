import express from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import nodemailer from "nodemailer";
import { getAuth0AccessToken } from "./auth0.js";
import axios from "axios";
const app = express();
const port = process.env.PORT; // Port number for the server

const corsOptions = {
  origin: process.env.PUBLIC_APP_URL,
};

app.use(cors(corsOptions));
app.use(express.json());

const exportDashboard = async (url) => {
  const accessToken = await getAuth0AccessToken();

  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--no-sandbox",
      "--headless",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
  });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    Authorization: `Bearer ${accessToken}`,
  });
  await page.goto(`${process.env.APP_URL}/${url}`, {
    waitUntil: "networkidle0",
  });
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

// Receive invoices files, receive customer data, receive organization data

app.post("/send-email", async (req, res) => {
  const { body } = req.body;
  console.log(body);
  if (!body.from || !body.to || !body.subject || !body.text || !body.html) {
    return res.status(400).send("Please provide all the required params");
  }

  const from = `${body.from} <${process.env.SENDGRID_SENDER_EMAIL}>`;

  const getPdfFiles = await Promise.all(
    body.attachments.map(async ({ filename, contentUrl }) => {
      const pdfFile = await axios.get(contentUrl, {
        responseType: "arraybuffer",
      });

      return {
        filename,
        content: pdfFile.data,
      };
    })
  );

  const sentEmail = await transporter.sendMail({
    from,
    to: body.to,
    subject: body.subject,
    text: body.text,
    html: body.html,
    attachments: getPdfFiles,
  });

  res.send(`Message sent: ${sentEmail}`);
});

app.get("/health", (req, res) => {
  res.send("OK");
  res.status(200);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
