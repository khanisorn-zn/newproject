// วางโค้ดนี้ในไฟล์ใหม่ เช่น removeDuplicates.js แล้วรันด้วย node.js

const { civilServantActQuestions } = require('./civil_servant_act');

// สร้าง array ใหม่ที่ไม่มี question ซ้ำ
const uniqueQuestions = [];
const seen = new Set();

for (const q of civilServantActQuestions) {
    if (!seen.has(q.question)) {
        uniqueQuestions.push(q);
        seen.add(q.question);
    }
}

// แสดงจำนวนข้อที่เหลือ
console.log('จำนวนคำถามที่ไม่ซ้ำ:', uniqueQuestions.length);

// ถ้าต้องการ export เป็นไฟล์ใหม่
const fs = require('fs');
fs.writeFileSync('civil_servant_act_unique.js', 
    'export const civilServantActQuestions = ' + JSON.stringify(uniqueQuestions, null, 4) + ';'
);