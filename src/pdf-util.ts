import type {TextItem} from "pdfjs-dist/types/src/display/api.js";
import fs from "node:fs";
import * as pdf from "pdfjs-dist/legacy/build/pdf.mjs";
import PDFDocument from "pdfkit";
import {getGeneratedFilePath, getReportPath} from "./files.js";

export async function extractFullEtfReportText(quarter:  1 | 2 | 3 | 4): Promise<string> {
    return extractFullPdfText(getReportPath(quarter));
}

export async function extractFullGeneratedResourceText(name: string): Promise<string> {
    return extractFullPdfText(getGeneratedFilePath(name));
}

async function extractFullPdfText(path: string): Promise<string>  {
    const data = new Uint8Array(fs.readFileSync(path));
    const pdfDoc = await pdf.getDocument({ data, verbosity: 0  }).promise;

    let fullText = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map(item => (item as TextItem).str)
            .join(' ');

        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
}

export async function createPdf(fileName: string, title: string, contents: string, description?: string): Promise<void> {
    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: 72,
            bottom: 72,
            left: 72,
            right: 72
        }
    });

    const createPdfStream = fs.createWriteStream(getGeneratedFilePath(fileName));
    doc.pipe(createPdfStream);

    doc.fontSize(24)
        .font('Helvetica-Bold')
        .text(title, { align: 'center' });

    if (description) {
        doc.moveDown(0.5)
            .fontSize(16)
            .font('Helvetica-Oblique')
            .fillColor('#555555')
            .text(description, {
                align: 'left'
            });
    }

    doc.moveDown(1)
        .fontSize(12)
        .font('Helvetica')
        .fillColor('black')
        .text(contents, {align: 'left'});

    doc.end();

    await new Promise<void>((resolve, reject) => {
        createPdfStream.on('finish', resolve);
        createPdfStream.on('error', reject);
    });
}