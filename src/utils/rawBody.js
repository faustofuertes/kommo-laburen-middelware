import express from "express";

// Lee TODO como  raw; después lo parseamos nosotros 
export const rawBody = express.raw({ type: "*/*" });