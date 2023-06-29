import axios from "axios";
import sharp from "sharp";
import fs from "fs";

export const getImage = async (filePath: string) => {
  const imageFilename = `image_${Date.now()}.jpg`;
  await axios({
    url: filePath,
    responseType: "stream",
  }).then(
    (response) =>
      new Promise<void>((resolve, reject) => {
        response.data
          .pipe(fs.createWriteStream(imageFilename))
          .on("finish", () => resolve())
          .on("error", (error: any) => reject(error));
      })
  );
  const convertedFilename = `image_${Date.now()}.png`;
  const imageInfo = await sharp(imageFilename)
    .toFormat("png")
    .ensureAlpha()
    .resize({
      width: 1024,
      height: 1024,
    })
    .toFile(convertedFilename);
  deleteFile(imageFilename);
  console.log(imageInfo);
  if (imageInfo.format !== "png") {
    deleteFile(convertedFilename);
    return {
      error: "Please send a valid PNG image.",
    };
  }

  const imageSize = fs.statSync(convertedFilename).size;
  const maxSize = 4 * 1024 * 1024; // 4MB
  if (imageSize > maxSize) {
    deleteFile(convertedFilename);
    return {
      error: "The image size exceeds the limit of 4MB.",
    };
  }

  const imageDimensions = await sharp(convertedFilename).metadata();
  if (imageDimensions.width !== imageDimensions.height) {
    deleteFile(convertedFilename);
    return {
      error: "Please send a square image.",
    };
  }

  return {
    file: fs.createReadStream(convertedFilename),
    fileName: convertedFilename,
    error: null,
  };
};

export const deleteFile = (fileName: string) => {
  fs.unlinkSync(fileName);
};
