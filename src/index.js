import express from "express";
import "dotenv/config";
import kommoRouter from "./routes/kommo.route.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.use("/kommo", kommoRouter);

app.listen(PORT, () => {
  console.log(`Server running`);
});