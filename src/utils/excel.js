import * as XLSX from 'xlsx';

export function exportToExcel(data, fileName, sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('لا توجد بيانات للتصدير');
    return;
  }

  // إنشاء ورقة العمل (Worksheet)
  const worksheet = XLSX.utils.json_to_sheet(data);

  // تعيين اتجاه الصفحة من اليمين لليسار (RTL) لدعم اللغة العربية بشكل أفضل
  if(!worksheet['!views']) worksheet['!views'] = [];
  worksheet['!views'].push({ rightToLeft: true });

  // إنشاء مصنف (Workbook) وإضافة ورقة العمل إليه
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // تحميل الملف
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
