import { createWorker, PSM } from 'tesseract.js';
import fs from 'fs'
import { PDFName, PDFDocument, PDFDict, StandardFonts, PDFFont, CustomFontEmbedder } from 'pdf-lib';
import { fromPath, fromBuffer } from "pdf2pic";
import { createMuPdf } from "mupdf-js";
import { PDFExtract } from 'pdf.js-extract';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';




(async () => {


  const fileName = "26 Haziran 1997 Perşembe copy"
  const orjPdf = fs.readFileSync(`pdf/${fileName}.pdf`)
  const pdfDoc = await PDFDocument.load(orjPdf)

  const pages = pdfDoc.getPages()

  /*
    const fileName = "26 Haziran 1997 Perşembe copy"
    const mupdf = await createMuPdf();
    const orjPdf = fs.readFileSync(`pdf/${fileName}.pdf`)
    const doc = mupdf.load(orjPdf);
  */
  const pdfOutBufferArray = []


  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage('tur+osd');
  await worker.initialize('tur+osd');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO_OSD,
    tessedit_char_whitelist: "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZabcçdefgğhıijklmnoöprsştuüvyzQqXxWw .,:;\"!'+-*"
  })
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]


    const { width, height } = page.getSize()
    console.log(width, height)
    const pageToConvertAsImage = i + 1;
    const options = {
      density: 300,
      saveFilename: "img",
      savePath: "./temp_img",
      format: "jpg",
      width: width * 4.167,
      height: height * 4.167
    };
    const storeAsImage = fromBuffer(orjPdf, options);


    await storeAsImage(pageToConvertAsImage)
    console.log(`Page ${pageToConvertAsImage} is now converted as image`);

    console.log("beforerecognize")
    const { data: { text } } = await worker.recognize("temp_img/img." + (i + 1) + ".jpg");
    console.log("here", text)
    const { data } = await worker.getPDF("a")

    console.log("tessworking")
    //fs.writeFileSync("outpdf/result"+i+".pdf", Buffer.from(data));

    pdfOutBufferArray.push(data)


  }

  await worker.terminate();
  /*const pdfDoc = new HummusRecipe('tesseract-ocr-result.pdf', 'output.pdf');
  pdfDoc
    .editPage(1)
    .image('test2.jpg', 0, 0, {width: pdfDoc.metadata[1].width, keepAspectRatio: true})
    .endPage()
    .endPDF();
  console.log(pdfDoc.metadata);*/
  //replaceByOriginalImage(Buffer.from(pdfOutBufferArray[0]),)
  insertTextToPdfWithPdfBufferArray(pdfOutBufferArray, pdfDoc)


})();

const insertTextToPdfWithPdfBufferArray = async (bufferArray, sourcePdf) => {



  const fontBytes = fs.readFileSync('DensiaSans.otf');
  const font = fontkit.create(fontBytes)
  console.log(font.ascent, font.capHeight, font.descent, font.bbox, font.familyName)



  sourcePdf.registerFontkit(fontkit);
  const customFont = await sourcePdf.embedFont(fontBytes, { customName: "GlyphLessFont" });

  const sourcePages = sourcePdf.getPages()

  console.log(bufferArray)
  for (let i = 0; i < sourcePages.length; i++) {
    const buf = Buffer.from(bufferArray[i])
    const { width, height } = sourcePages[i].getSize()
    const pdfExtract = new PDFExtract();
    const data = await pdfExtract.extractBuffer(buf, {});


    data.pages[0].content.forEach((text) => {
      sourcePages[i].drawText(text.str, { x: text.x, y: height - text.y, size: text.height - text.height / 5, font: customFont, maxWidth: width })
    })

    /*
      const page = sourcePdf.addPage([width, height])

      data.pages[0].content.forEach((text) => {
        page.drawText(text.str, { x: text.x, y: height - text.y, size: text.height - text.height / 5, font: customFont, maxWidth: width, opacity: 0.2 })
      })
    

*/
  }



  //console.log("hrr",data.pages[0].content,data.pages[0].pageInfo);

  const pdfDoc2Bytes = await sourcePdf.save();
  fs.writeFileSync("newver.pdf", pdfDoc2Bytes);
  //fs.writeFileSync("newver.txt", pdfDoc2Bytes);
}



const replaceByOriginalImage = async (bufferData, sourceImageLoc, outputLoc) => {

  const pdfExtract = new PDFExtract();
  const data = await pdfExtract.extractBuffer(bufferData, {});

  //console.log("hrr",data.pages[0].content,data.pages[0].pageInfo);


  const pdfDoc = await PDFDocument.load(fs.readFileSync(`pdf/26 Haziran 1997 Perşembe copy.pdf`), {
    updateMetadata: false
  })
  pdfDoc.setLanguage("tur")

  const fontBytes = fs.readFileSync('DensiaSans.otf');

  const font = fontkit.create(fontBytes)

  console.log(font.ascent, font.capHeight, font.descent, font.bbox, font.familyName)
  pdfDoc.registerFontkit(fontkit);
  const customFont = await pdfDoc.embedFont(fontBytes, { customName: "GlyphLessFont" });

  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()
  const page = pdfDoc.addPage([width, height])

  data.pages[0].content.forEach((text) => {
    page.drawText(text.str, { x: text.x, y: height - text.y, size: text.height - text.height / 5, font: customFont, maxWidth: width, opacity: 0.2 })
  })

  const pdfDoc2Bytes = await pdfDoc.save();
  fs.writeFileSync("newver.pdf", pdfDoc2Bytes);
  fs.writeFileSync("newver.txt", pdfDoc2Bytes);



  /*const pdfDoc = await PDFDocument.load(bufferData)
  const pages = pdfDoc.getPages()
  const firstPage = pages[0]
  const { width, height } = firstPage.getSize()

  const xObjects = firstPage.node
    .Resources()
    .lookup(PDFName.of('XObject'), PDFDict);
    console.log(xObjects.keys())

  const imageRef =  xObjects.get(xObjects.keys()[0])
  pdfDoc.context.delete(imageRef);
  const jpgImage = await pdfDoc.embedJpg(fs.readFileSync(sourceImageLoc))

  firstPage.drawImage(jpgImage,{
    x:0, y:0, width:width, height:height
  })

  const pdfDoc2Bytes = await pdfDoc.save();

  fs.writeFileSync(outputLoc, pdfDoc2Bytes);
  */
}