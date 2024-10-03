const express = require("express");
const puppeteer = require("puppeteer");
var cors = require("cors");
const app = express();
const port = 3001;
const nodemailer = require("nodemailer");

app.use(cors());

const exportDashboard = async (url) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.emulateMediaType("screen");
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });
  await browser.close();
  return pdfBuffer;
};

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/export", async (req, res) => {
  const dashboardUrl = "http://localhost:3000/hidden-dashboard";

  const pdfBuffer = await exportDashboard(dashboardUrl);

  const buffer = Buffer.from(pdfBuffer);
  // Set response headers
  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="file.pdf"', // 'attachment' if you want to force download
    "Content-Length": buffer.length,
  });

  res.send(buffer);
});

app.post("/send-email", async (req, res) => {
  const dashboardUrl = "http://localhost:3000/hidden-dashboard";
  if (!dashboardUrl) {
    return res.status(400).send("Please provide a valid URL");
  }
  const pdfBuffer = await exportDashboard(dashboardUrl);

  const info = await transporter.sendMail({
    from: `'Data Insight' <${process.env.SENDGRID_SENDER_EMAIL}>`,
    to: "alexmartinez.mm98@gmail.com",
    subject: "Data Insight Report",
    text: "This is the data insight report",
    html: "<b>This is the data insight report</b>", // html body
    attachments: [
      {
        filename: "file.pdf",
        content: pdfBuffer,
      },
    ],
  });

  res.send("Message sent: %s", info.messageId);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
