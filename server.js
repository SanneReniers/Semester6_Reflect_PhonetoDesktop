const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads"); //Folder the script lives in

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR); // Creates the upload directory if it doesn't exist yet. Helps with error handling
}

//Storage configuration for multer

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[/\\?%*:|"<>]/g, "_"); // Replaces unsafe characters from the name it had on the phone
    cb(null, `${Date.now()}-${safeName}`); // No error, here's the value. Date.now is used in order to give every file a diffrent name.
  },
});

const upload = multer({ storage }); //Configured instance of multer


//Serving static files
app.use(express.static(path.join(__dirname, "public"))); //Any file in public gets served directly to the IP
app.use("/uploads", express.static(UPLOAD_DIR)); //Let's the desktop page offer download links to the uploaded files

//The upload route
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file received."); //Error handling
  }
  console.log(`Received: ${req.file.filename} (${req.file.size} bytes)`);
  res.json({ success: true, filename: req.file.filename, message: "Your reflection has been sent" });
});

//File list route
app.get("/files", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => { //Lists all the files
    if (err) return res.status(500).json({ error: "Could not read uploads" });

    const list = files
      .filter((name) => !name.startsWith("."))
      .map((name) => {
        const stats = fs.statSync(path.join(UPLOAD_DIR, name));
        return {
          name,
          size: stats.size,
          uploadedAt: stats.mtime,
          url: `/uploads/${encodeURIComponent(name)}`, //Removes special characters
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)); //Puts the newest upload first

    res.json(list); //Sends it as JSON
  });
});

//Finding local IP
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; //Machine's address on the wifi network. The phone can reach this. 
}

//Starting the server
app.listen(PORT, "0.0.0.0", () => { //Makes sure it accepts conncections from any network, localhost wouldn't work on a phone
  console.log(`On your phone: http://${getLocalIp()}:${PORT}`);
  console.log(`Locally: http://localhost:${PORT}`);
});