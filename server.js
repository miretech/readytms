const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const ai = require("./ai-automation");
app.use("/webhook", ai.router);

const gmail = require("./gmail-ratecon");
app.use("/gmail", gmail.router);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("ReadyTMS running on port " + PORT);
  console.log("Claude AI Automation: ACTIVE");
  console.log("Gmail Rate Con Engine: ACTIVE");
});
