const styleExcelSheet = (sheet, title, period, colCount) => {
  // Add 4 rows at the top
  sheet.spliceRows(1, 0, [], [], [], []);
  
  const lastCol = String.fromCharCode(64 + colCount);
  
  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  sheet.mergeCells(`A2:${lastCol}2`);
  const periodCell = sheet.getCell('A2');
  periodCell.value = `Periode: ${period || '-'}`;
  periodCell.font = { size: 11, italic: true };
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const printDateCell = sheet.getCell(`A3`);
  sheet.mergeCells(`A3:${lastCol}3`);
  printDateCell.value = `Dicetak pada: ${new Date().toLocaleString('id-ID')}`;
  printDateCell.font = { size: 10 };
  printDateCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const headerRow = sheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FF000000' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 25;

  // Add borders to all rows from row 5 down
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        // Center align the No column
        if (cell.col === 1) cell.alignment = { horizontal: 'center' };
      });
    }
  });
};

module.exports = { styleExcelSheet };
