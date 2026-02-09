import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getGeneratedFileNames(): string[] {
    const generatedFolderPath = path.join(__dirname, '..', 'generated');
    if (!fs.existsSync(generatedFolderPath)) {
        fs.mkdirSync(generatedFolderPath, {recursive: true});
    }
    const files = fs.readdirSync(generatedFolderPath, { withFileTypes: true });
    return files.filter(file => file.isFile())
        .filter(file => file.name.endsWith('.pdf'))
        .map(file => file.name.replace('.pdf', ''));
}

export function getReportPath(quarter: 1 | 2 | 3 | 4): string {
    return path.join(__dirname, `../resources/etf_perspectives_2025_q${quarter}.pdf`);
}

export function getGeneratedFilePath(name: string): string {
    return path.join(__dirname, `../generated/${name}.pdf`);
}