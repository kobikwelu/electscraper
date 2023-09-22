const Post = require('../models/Post');
const FinancialProductGuideV2 = require('../models/FinancialProductGuideV2');
const { DeleteObjectCommand, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config')
const ExcelJS = require('exceljs');
const { s3Client } = require('../middlewares/upload');


exports.insertFinancialApps = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Get the file from S3
        const fileData = await s3Client.send(new GetObjectCommand({
            Bucket: config.aws.AWS_BUCKET,
            Key: req.file.key
        }));

        // Read the Excel file using exceljs
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.read(fileData.Body);
        const worksheet = workbook.getWorksheet('apps');

        const data = [];
        const columns = [
            'business_name', 'business_website', 'business_about', 'business_product_offerings',
            'inbound_sign_in_url', 'outbound_apple_store', 'outbound_google_play_store', 'logo'
        ];

        const totalRows = worksheet.rowCount;

        for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            const businessName = row.getCell(columns.indexOf('business_name') + 1).value;

            if (!businessName) {
                continue;  // Skip rows without a business name
            }

            const rowData = {};

            for (let colNumber = 1; colNumber <= columns.length; colNumber++) {
                const cell = row.getCell(colNumber);

                if (cell.value && cell.value.text && cell.value.hyperlink) {
                    rowData[columns[colNumber - 1]] = cell.value.text;
                } else if (columns[colNumber - 1] === 'logo') {
                    const sanitizedBusinessName = businessName.replace(/[^a-zA-Z0-9]/g, '_');
                    const s3ImagePath = `${sanitizedBusinessName}.png`;
                    try {
                        // Check if the image exists in S3
                        await s3Client.send(new HeadObjectCommand({
                            Bucket: config.aws.AWS_BUCKET,
                            Key: s3ImagePath
                        }));

                        rowData['logo'] = `https://${config.aws.AWS_BUCKET}.s3.us-west-1.amazonaws.com/${s3ImagePath}`;
                    } catch (e) {
                        // Image does not exist or another error occurred
                        logger.error('Could not find image for business:', businessName);
                    }
                } else {
                    rowData[columns[colNumber - 1]] = cell.value;
                }
            }

            data.push(rowData);
        }

        // Save the data to MongoDB
        await FinancialProductGuideV2.insertMany(data);

        await s3Client.send(new DeleteObjectCommand({
            Bucket: config.aws.AWS_BUCKET,
            Key: req.file.key
        }));

        res.status(200).json({ message: 'success' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "something went wrong" });
    }
};







