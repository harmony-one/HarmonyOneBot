const cv = require('opencv4nodejs');

// Replace 'path/to/your/image.jpg' with the actual path to your image
const imagePath = 'path/to/your/image.jpg';

// Read the image using OpenCV
const image = cv.imread(imagePath);

// Create a QRCodeDetector instance
const qrCodeDetector = new cv.QRCodeDetector();

// Detect QR codes in the image
const decodedInfo = qrCodeDetector.detectAndDecode(image);

// Check if any QR codes were detected
if (decodedInfo && decodedInfo.length > 0) {
  // Print the decoded information
  console.log('Decoded QR code:', decodedInfo);
} else {
  console.log('No QR code found in the image.');
}