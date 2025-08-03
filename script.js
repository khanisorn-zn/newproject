// ตรวจสอบการโหลดไฟล์: ข้อความนี้จะปรากฏใน Console ทันทีที่ไฟล์นี้ถูกโหลด
console.log("ไฟล์ script.js ถูกโหลดและกำลังทำงาน!");

// ประกาศตัวแปร questions เป็นแบบ let เพื่อให้สามารถกำหนดค่าใหม่ได้
let questions = [];

// ตัวแปรสถานะปัจจุบันของข้อสอบ
let currentQuestionIndex = 0;
let score = 0;
// userAnswers จะเก็บ index ของตัวเลือกที่ผู้ใช้เลือกสำหรับแต่ละคำถาม
// เช่น userAnswers[0] = 2 หมายถึงผู้ใช้เลือกตัวเลือกที่ 2 สำหรับคำถามข้อ 0
let userAnswers = [];
let selectedQuizType = null; // เก็บประเภทข้อสอบที่กำลังทำอยู่

// ตัวแปรสำหรับควบคุมขนาดตัวอักษรของคำถาม
const MIN_FONT_SIZE_EM = 1.0; // ขนาดต่ำสุด (em)
const MAX_FONT_SIZE_EM = 2.5; // ขนาดสูงสุด (em)
const FONT_SIZE_STEP_EM = 0.1; // ขั้นตอนการเพิ่ม/ลด (em)
let currentQuestionFontSize = 1.5; // ขนาดเริ่มต้น (ตรงกับค่าใน CSS)

// รับ Element ของ DOM ที่จำเป็น
const questionCounterElement = document.getElementById('questionCounter');
const questionTextElement = document.getElementById('questionText');
const optionsContainer = document.getElementById('optionsContainer');
const feedbackContainer = document.getElementById('feedbackContainer');
const feedbackTextElement = document.getElementById('feedbackText');
const explanationTextElement = document.getElementById('explanationText');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const resetQuizBtn = document.getElementById('resetQuizBtn'); // เปลี่ยนชื่อจาก resetBtn
const messageBox = document.getElementById('messageBox'); // กล่องข้อความแจ้งเตือน

// New: Get text size buttons
const textIncreaseBtn = document.getElementById('textIncreaseBtn');
const textDecreaseBtn = document.getElementById('textDecreaseBtn');

// --- ฟังก์ชันช่วยเหลือ ---

/**
 * แสดงข้อความในกล่องข้อความแจ้งเตือน
 * @param {string} message - ข้อความที่ต้องการแสดง
 * @param {'success' | 'error' | 'info'} type - ประเภทของข้อความ ('success', 'error' หรือ 'info') สำหรับการจัดสไตล์
 */
function showMessage(message, type) {
    messageBox.textContent = message;
    messageBox.className = `message-box ${type === 'success' ? 'message-success' : type === 'error' ? 'message-error' : 'message-info'} block`;
    // ซ่อนข้อความหลังจาก 3 วินาที
    setTimeout(() => {
        hideMessage();
    }, 3000);
}

/**
 * ซ่อนกล่องข้อความแจ้งเตือน
 */
function hideMessage() {
    messageBox.className = 'message-box hidden';
    messageBox.textContent = '';
}

/**
 * บันทึกความคืบหน้าปัจจุบัน (ดัชนีข้อคำถาม, คำตอบของผู้ใช้, ประเภทข้อสอบที่เลือก) ไปยัง localStorage
 */
function saveProgress() {
    try {
        localStorage.setItem('quizCurrentIndex', currentQuestionIndex.toString());
        localStorage.setItem('quizUserAnswers', JSON.stringify(userAnswers));
        localStorage.setItem('quizSelectedType', selectedQuizType);
        // console.log('Progress saved:', currentQuestionIndex, userAnswers, selectedQuizType);
    } catch (e) {
        console.error('Failed to save progress to localStorage:', e);
        showMessage('ไม่สามารถบันทึกความคืบหน้าได้ กรุณาตรวจสอบการตั้งค่าเบราว์เซอร์ของคุณ', 'error');
    }
}

/**
 * โหลดความคืบหน้าที่บันทึกไว้จาก localStorage
 * @returns {object | null} วัตถุที่มี currentQuestionIndex, userAnswers, selectedQuizType หรือ null หากไม่มีข้อมูล
 */
function loadProgress() {
    try {
        const savedIndex = localStorage.getItem('quizCurrentIndex');
        const savedAnswers = localStorage.getItem('quizUserAnswers');
        const savedType = localStorage.getItem('quizSelectedType');

        if (savedIndex !== null && savedAnswers !== null && savedType !== null) {
            currentQuestionIndex = parseInt(savedIndex, 10);
            userAnswers = JSON.parse(savedAnswers);
            selectedQuizType = savedType;
            // console.log('Progress loaded:', currentQuestionIndex, userAnswers, selectedQuizType);
            return { currentQuestionIndex, userAnswers, selectedQuizType };
        }
    } catch (e) {
        console.error('Failed to load progress from localStorage:', e);
        showMessage('ไม่สามารถโหลดความคืบหน้าได้ ข้อมูลอาจเสียหาย', 'error');
        // หากโหลดไม่ได้ ให้เริ่มต้นใหม่
        resetQuiz(false);
    }
    return null;
}

/**
 * ฟังก์ชันสำหรับสุ่มลำดับของ Array (Fisher-Yates Shuffle)
 * @param {Array} array - อาร์เรย์ที่ต้องการสุ่ม
 * @returns {Array} อาร์เรย์ที่สุ่มแล้ว
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // สลับตำแหน่ง
    }
    return array;
}

/**
 * ฟังก์ชันสำหรับโหลดคำถามจากไฟล์ภายนอก
 * @param {string} quizType - ประเภทของข้อสอบที่ต้องการโหลด
 */
async function loadQuestions(quizType) {
    let module;
    try {
        // รีเซ็ตสถานะข้อสอบเมื่อเลือก พ.ร.บ. ใหม่
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        selectedQuizType = quizType; // กำหนดประเภทข้อสอบที่เลือก

        if (quizType === 'all_acts_random') {
            // โหลดคำถามจากทุกไฟล์
            const [
                civilServantModule, pdpaModule, moeModule,
                goodGovernanceModule, tortLiabilityModule,
                adminOrgModule, leaveRegulationsModule
            ] = await Promise.all([
                import('./data/civil_servant_act.js'),
                import('./data/pdpa_act.js'),
                import('./data/moe_act.js'),
                import('./data/good_governance_act.js'),
                import('./data/tort_liability_act.js'),
                import('./data/admin_org_act.js'),
                import('./data/leave_regulations.js')
            ]);
            
            // รวมคำถามทั้งหมดเข้าด้วยกัน
            let allQuestions = [
                ...civilServantModule.civilServantActQuestions,
                ...pdpaModule.pdpaActQuestions,
                ...moeModule.moeActQuestions,
                ...goodGovernanceModule.goodGovernanceActQuestions,
                ...tortLiabilityModule.tortLiabilityActQuestions,
                ...adminOrgModule.adminOrgActQuestions,
                ...leaveRegulationsModule.leaveRegulationsQuestions
            ];
            
            // สุ่มคำถามทั้งหมด
            allQuestions = shuffleArray(allQuestions);

            // จำกัดจำนวนข้อเป็น 100 ข้อ
            const maxQuestions = 100;
            questions = allQuestions.slice(0, Math.min(allQuestions.length, maxQuestions));

        } else {
            // โหลดคำถามตามประเภทที่เลือก และสุ่มเฉพาะใน พ.ร.บ. นั้นๆ
            switch (quizType) {
                case 'civil_servant_act':
                    module = await import('./data/civil_servant_act.js');
                    questions = module.civilServantActQuestions;
                    break;
                case 'pdpa_act':
                    module = await import('./data/pdpa_act.js');
                    questions = module.pdpaActQuestions;
                    break;
                case 'moe_act':
                    module = await import('./data/moe_act.js');
                    questions = module.moeActQuestions;
                    break;
                case 'good_governance_act':
                    module = await import('./data/good_governance_act.js');
                    questions = module.goodGovernanceActQuestions;
                    break;
                case 'tort_liability_act':
                    module = await import('./data/tort_liability_act.js');
                    questions = module.tortLiabilityActQuestions;
                    break;
                case 'admin_org_act':
                    module = await import('./data/admin_org_act.js');
                    questions = module.adminOrgActQuestions;
                    break;
                case 'leave_regulations':
                    module = await import('./data/leave_regulations.js');
                    questions = module.leaveRegulationsQuestions;
                    break;
                default:
                    console.error("ไม่พบประเภทข้อสอบที่ระบุ:", quizType);
                    questions = [];
                    showMessage('ไม่พบชุดข้อสอบที่เลือก', 'error');
                    return;
            }
            // สุ่มคำถามสำหรับ พ.ร.บ. ที่เลือก
            questions = shuffleArray(questions);
        }

        console.log(`โหลดคำถามสำหรับ ${quizType} สำเร็จ! มี ${questions.length} ข้อ`);
        
        // ซ่อนหน้าจอเลือก พ.ร.บ. (homeScreen) และแสดงหน้าจอทำข้อสอบ (quizScreen) ทันที
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('quizScreen').style.display = 'block';
        questionCounterElement.style.display = 'block'; // แสดงตัวนับข้อสอบที่ย้ายมาอยู่ด้านนอก
        
        // บันทึกความคืบหน้าเริ่มต้น
        saveProgress();
        // แสดงคำถามข้อแรก (หรือข้อที่โหลดมา)
        displayQuestion();
        
        closeNav(); // ปิด sidebar หลังจากเลือก พ.ร.บ.
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดคำถาม:", error);
        showMessage("ไม่สามารถโหลดคำถามได้ กรุณาลองใหม่อีกครั้ง", 'error');
        questions = []; // เคลียร์คำถามหากโหลดไม่สำเร็จ
    }
}

/**
 * ฟังก์ชันสำหรับแสดงคำถามและตัวเลือก
 */
function displayQuestion() {
    hideMessage(); // ซ่อนข้อความแจ้งเตือน

    if (questions.length === 0) {
        questionTextElement.innerText = 'ไม่พบคำถามในระบบ กรุณาเลือกพระราชบัญญัติ';
        optionsContainer.innerHTML = '';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        resetQuizBtn.disabled = true;
        questionCounterElement.innerText = '0/0';
        questionCounterElement.style.display = 'none'; // ซ่อนตัวนับเมื่อไม่มีคำถาม
        feedbackContainer.style.display = 'none';
        return;
    }

    // ตรวจสอบให้แน่ใจว่า currentQuestionIndex อยู่ในช่วงที่ถูกต้อง
    if (currentQuestionIndex < 0) {
        currentQuestionIndex = 0;
    } else if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = questions.length - 1; // ไปที่ข้อสุดท้ายหากเกิน
    }

    const questionData = questions[currentQuestionIndex];
    const cleanQuestionText = questionData.question.replace(/^\d+\.\s*/, '');
    questionTextElement.innerText = `${cleanQuestionText}`; // ลบ "ข้อที่ X." ออกจากคำถามหลัก
    
    // Apply current font size
    questionTextElement.style.fontSize = `${currentQuestionFontSize}em`;

    // อัปเดตตัวนับข้อสอบที่ย้ายไปอยู่ด้านนอก
    questionCounterElement.innerText = `ข้อที่ ${currentQuestionIndex + 1} จาก ${questions.length}`;

    optionsContainer.innerHTML = ''; // ล้างตัวเลือกเดิม
    feedbackContainer.style.display = 'none'; // ซ่อน feedback ก่อน
    
    // สร้างปุ่มตัวเลือก
    questionData.options.forEach((option, i) => {
        const button = document.createElement('button');
        button.innerText = option;
        button.classList.add('option-button');
        button.dataset.index = i; // เก็บ index ของตัวเลือกไว้ใน dataset

        button.addEventListener('click', () => {
            // ตรวจสอบว่ายังไม่ได้เลือกคำตอบสำหรับข้อนี้
            if (userAnswers[currentQuestionIndex] === undefined || userAnswers[currentQuestionIndex] === null) {
                checkAnswer(i, questionData.answer, questionData.reason, button);
            }
        });
        optionsContainer.appendChild(button);
    });

    // ตรวจสอบว่าข้อนี้เคยตอบแล้วหรือไม่
    const answeredIndex = userAnswers[currentQuestionIndex];
    if (answeredIndex !== undefined && answeredIndex !== null) {
        // หากเคยตอบแล้ว ให้แสดงผลเฉลยและเหตุผลทันที
        const allOptionButtons = optionsContainer.querySelectorAll('.option-button');
        allOptionButtons.forEach(btn => {
            const index = parseInt(btn.dataset.index, 10);
            if (index === questionData.answer) {
                btn.classList.add('correct');
            } else if (index === answeredIndex && index !== questionData.answer) {
                btn.classList.add('wrong');
            }
            btn.disabled = true; // ปิดการใช้งานปุ่มเมื่อตอบแล้ว
        });

        feedbackTextElement.innerText = answeredIndex === questionData.answer ? "ถูกต้อง!" : `ผิด! คำตอบที่ถูกต้องคือ ${questions[currentQuestionIndex].options[correctAnswerIndex]}`;
        feedbackTextElement.classList.toggle('correct-feedback', answeredIndex === questionData.answer);
        feedbackTextElement.classList.toggle('wrong-feedback', answeredIndex !== questionData.answer);
        explanationTextElement.innerText = questionData.reason;
        feedbackContainer.style.display = 'block';
    } else {
        // หากยังไม่ตอบ ให้เปิดใช้งานปุ่มทั้งหมด
        optionsContainer.querySelectorAll('.option-button').forEach(btn => btn.disabled = false);
    }

    // อัปเดตสถานะปุ่มนำทาง
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    resetQuizBtn.disabled = false; // เปิดใช้งานปุ่มรีเซ็ตเสมอเมื่อมีข้อสอบโหลดอยู่
}

/**
 * ฟังก์ชันสำหรับตรวจคำตอบ
 * @param {number} selectedIndex - ดัชนีของตัวเลือกที่ผู้ใช้เลือก
 * @param {number} correctAnswerIndex - ดัชนีของคำตอบที่ถูกต้อง
 * @param {string} reason - เหตุผลของคำตอบ
 * @param {HTMLElement} clickedButton - ปุ่มที่ผู้ใช้คลิก
 */
function checkAnswer(selectedIndex, correctAnswerIndex, reason, clickedButton) {
    // บันทึกคำตอบของผู้ใช้
    userAnswers[currentQuestionIndex] = selectedIndex;
    saveProgress(); // บันทึกความคืบหน้าทันที

    // ปิดการใช้งานปุ่มตัวเลือกทั้งหมดหลังจากเลือกคำตอบ
    optionsContainer.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
        button.classList.remove('correct', 'wrong'); // ลบ class เดิมออกก่อน
    });

    // แสดงผลเฉลยและเหตุผล
    if (selectedIndex === correctAnswerIndex) {
        score++; // เพิ่มคะแนน (หากต้องการแสดงคะแนนรวม)
        clickedButton.classList.add('correct');
        feedbackTextElement.innerText = "ถูกต้อง!";
        feedbackTextElement.classList.add('correct-feedback');
        feedbackTextElement.classList.remove('wrong-feedback');
    } else {
        clickedButton.classList.add('wrong');
        // แสดงคำตอบที่ถูกต้อง
        optionsContainer.querySelector(`[data-index="${correctAnswerIndex}"]`).classList.add('correct');
        feedbackTextElement.innerText = `ผิด! คำตอบที่ถูกต้องคือ ${questions[currentQuestionIndex].options[correctAnswerIndex]}`;
        feedbackTextElement.classList.add('wrong-feedback');
        feedbackTextElement.classList.remove('correct-feedback');
    }

    explanationTextElement.innerText = reason;
    feedbackContainer.style.display = 'block';
}

/**
 * ไปยังคำถามถัดไป
 */
function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        saveProgress();
    } else {
        // หากเป็นข้อสุดท้าย ให้แสดงผลลัพธ์
        displayResult();
    }
}

/**
 * ย้อนกลับไปยังคำถามก่อนหน้า
 */
function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        saveProgress();
    }
}

/**
 * รีเซ็ตความคืบหน้าของข้อสอบ
 * @param {boolean} showMsg - true หากต้องการแสดงข้อความแจ้งเตือนการรีเซ็ต
 */
function resetQuiz(showMsg = true) {
    try {
        localStorage.removeItem('quizCurrentIndex');
        localStorage.removeItem('quizUserAnswers');
        localStorage.removeItem('quizSelectedType');
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        selectedQuizType = null;
        
        // กลับไปหน้าเลือก พ.ร.บ.
        document.getElementById('quizScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'none';
        document.getElementById('homeScreen').style.display = 'block';
        questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบ
        questions = []; // เคลียร์คำถามที่โหลดอยู่

        if (showMsg) {
            showMessage('รีเซ็ตข้อสอบเรียบร้อยแล้ว!', 'success');
        }
    } catch (e) {
        console.error('Failed to reset quiz:', e);
        showMessage('ไม่สามารถรีเซ็ตข้อสอบได้', 'error');
    }
}

/**
 * ฟังก์ชันสำหรับแสดงผลคะแนน
 */
function displayResult() {
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบเมื่อแสดงผลลัพธ์
    document.getElementById('scoreDisplay').innerText = `คุณได้คะแนน ${score} จาก ${questions.length} ข้อ`;
    // เมื่อจบข้อสอบ ให้ล้างความคืบหน้า
    resetQuiz(false); // ไม่ต้องแสดงข้อความรีเซ็ต
}

// --- ฟังก์ชันสำหรับ Sidebar ---
function openNav() {
    document.getElementById("mySidebar").style.width = "250px";
    document.getElementById("main").style.marginLeft = "250px";
    if (window.innerWidth <= 768) {
        document.querySelector('.openbtn').style.display = 'none';
    }
}

function closeNav() {
    document.getElementById("mySidebar").style.width = "0";
    document.getElementById("main").style.marginLeft= "0";
    if (window.innerWidth <= 768) {
        document.querySelector('.openbtn').style.display = 'block';
    }
}

// --- Theme Toggle Logic ---
const themeToggleButton = document.getElementById('themeToggleButton');
const body = document.body;
const THEME_KEY = 'appTheme'; // Key for localStorage

/**
 * ใช้ธีมที่ระบุ
 * @param {'light' | 'dark'} theme - ธีมที่ต้องการใช้
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // ไอคอนพระอาทิตย์สำหรับธีมมืด
    } else {
        body.classList.remove('dark-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // ไอคอนพระจันทร์สำหรับธีมสว่าง
    }
}

/**
 * ปรับขนาดตัวอักษรของคำถาม
 * @param {number} step - ค่าที่ต้องการเพิ่ม/ลด (เช่น 0.1 หรือ -0.1)
 */
function adjustQuestionFontSize(step) {
    let newSize = parseFloat((currentQuestionFontSize + step).toFixed(2)); // ใช้ toFixed(2) เพื่อหลีกเลี่ยงปัญหา floating point
    if (newSize < MIN_FONT_SIZE_EM) {
        newSize = MIN_FONT_SIZE_EM;
        showMessage('ขนาดตัวอักษรเล็กที่สุดแล้ว', 'info');
    } else if (newSize > MAX_FONT_SIZE_EM) {
        newSize = MAX_FONT_SIZE_EM;
        showMessage('ขนาดตัวอักษรใหญ่ที่สุดแล้ว', 'info');
    }
    currentQuestionFontSize = newSize;
    questionTextElement.style.fontSize = `${currentQuestionFontSize}em`;
    localStorage.setItem('questionFontSize', currentQuestionFontSize.toString()); // Save to localStorage
}

// --- Event Listeners ---

// เมื่อ DOM โหลดเสร็จ ให้แนบ Event Listeners กับปุ่มต่างๆ
document.addEventListener('DOMContentLoaded', async () => {
    // โหลดธีมที่บันทึกไว้
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // ค่าเริ่มต้นเป็น light theme หากไม่มีการบันทึกไว้
        applyTheme('light');
    }

    // Load saved font size for question text
    const savedFontSize = localStorage.getItem('questionFontSize');
    if (savedFontSize) {
        currentQuestionFontSize = parseFloat(savedFontSize);
    }
    questionTextElement.style.fontSize = `${currentQuestionFontSize}em`; // Apply initial font size

    // ปุ่ม Hamburger icon สำหรับเปิด Sidebar
    document.querySelector('.openbtn').addEventListener('click', openNav);

    // ปุ่มปิด Sidebar
    document.querySelector('.closebtn').addEventListener('click', closeNav);

    // Event Listener สำหรับ Theme Toggle Button
    themeToggleButton.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            applyTheme('light');
            localStorage.setItem(THEME_KEY, 'light');
        } else {
            applyTheme('dark');
            localStorage.setItem(THEME_KEY, 'dark');
        }
    });

    // Event Listener สำหรับปุ่ม "ถัดไป"
    nextBtn.addEventListener('click', nextQuestion);

    // Event Listener สำหรับปุ่ม "ย้อนกลับ"
    prevBtn.addEventListener('click', prevQuestion);

    // Event Listener สำหรับปุ่ม "รีเซ็ตข้อสอบ"
    resetQuizBtn.addEventListener('click', () => resetQuiz(true)); // ส่ง true เพื่อให้แสดงข้อความ

    // Event Listener สำหรับปุ่ม "ทำข้อสอบอีกครั้ง" (จากหน้าจอผลลัพธ์)
    document.getElementById('restartButton').addEventListener('click', () => {
        // เมื่อกดทำข้อสอบอีกครั้ง ให้กลับไปหน้าเลือก พ.ร.บ. และรีเซ็ตทุกอย่าง
        resetQuiz(false); // ไม่ต้องแสดงข้อความรีเซ็ต
    });

    // Event Listener สำหรับปุ่ม Login/Logout ใน Sidebar (ยังไม่มีฟังก์ชันจริง)
    document.getElementById('sidebarLogoutBtn').addEventListener('click', function() {
        showMessage("ยังไม่มีระบบ Logout จริงจัง! จะพัฒนาในขั้นตอนถัดไป", 'info'); // เปลี่ยน alert เป็น showMessage
        closeNav();
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.บ. ระเบียบข้าราชการพลเรือน
    document.getElementById('selectCivilServantActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.บ. ระเบียบข้าราชการพลเรือน");
        loadQuestions('civil_servant_act');
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
    document.getElementById('selectPdpaActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล");
        loadQuestions('pdpa_act');
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.บ. ระเบียบบริหารราชการกระทรวงศึกษาธิการ
    document.getElementById('selectMoeActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.บ. ระเบียบบริหารราชการกระทรวงศึกษาธิการ");
        loadQuestions('moe_act');
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.ฎ. หลักเกณฑ์และวิธีการบริหารกิจการบ้านเมืองที่ดี
    document.getElementById('selectGoodGovernanceActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.ฎ. หลักเกณฑ์และวิธีการบริหารกิจการบ้านเมืองที่ดี");
        loadQuestions('good_governance_act');
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.บ. ความรับผิดทางละเมิดของเจ้าหน้าที่
    document.getElementById('selectTortLiabilityActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.บ. ความรับผิดทางละเมิดของเจ้าหน้าที่");
        loadQuestions('tort_liability_act');
    });

    // Event Listener สำหรับปุ่มเลือก พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน
    document.getElementById('selectAdminOrgActBtn').addEventListener('click', function() {
        console.log("เลือก พ.ร.บ. ระเบียบบริหารราชการแผ่นดิน");
        loadQuestions('admin_org_act');
    });

    // Event Listener สำหรับปุ่มเลือก ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ
    document.getElementById('selectLeaveRegulationsBtn').addEventListener('click', function() {
        console.log("เลือก ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ");
        loadQuestions('leave_regulations');
    });

    // Event Listener สำหรับปุ่ม "สุ่มรวม พ.ร.บ. ทั้งหมด" (ใหม่)
    document.getElementById('selectAllActsRandomBtn').addEventListener('click', function() {
        console.log("เลือก สุ่มรวม พ.ร.บ. ทั้งหมด");
        loadQuestions('all_acts_random');
    });

    // Event Listener สำหรับปุ่ม "เลือก พ.ร.บ." ใน Sidebar
    document.getElementById('sidebarSelectQuizBtn').addEventListener('click', function() {
        console.log("ปุ่ม 'เลือก พ.ร.บ.' ใน Sidebar ถูกกดแล้ว!");
        document.getElementById('homeScreen').style.display = 'block'; // แสดงหน้าจอเลือก พ.ร.บ.
        document.getElementById('quizScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'none';
        questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบ
        closeNav();
    });

    // New: Event Listeners for text size buttons
    textIncreaseBtn.addEventListener('click', () => adjustQuestionFontSize(FONT_SIZE_STEP_EM));
    textDecreaseBtn.addEventListener('click', () => adjustQuestionFontSize(-FONT_SIZE_STEP_EM));

    // เพิ่ม Event Listener สำหรับการปรับขนาดหน้าจอ เพื่อจัดการปุ่ม openbtn
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            document.querySelector('.openbtn').style.display = 'block';
            document.getElementById("mySidebar").style.width = "0";
            document.getElementById("main").style.marginLeft = "0";
        } else {
            if (document.getElementById("mySidebar").style.width === "0px") {
                document.querySelector('.openbtn').style.display = 'block';
            }
        }
    });

    // ซ่อนตัวนับข้อสอบเมื่อโหลดหน้าครั้งแรก (เพราะยังไม่อยู่ในหน้า quizScreen)
    questionCounterElement.style.display = 'none';

    // โหลดความคืบหน้าเมื่อ DOM โหลดเสร็จ
    const savedProgress = loadProgress();
    if (savedProgress && savedProgress.selectedQuizType) {
        // หากมีข้อมูลที่บันทึกไว้ ให้โหลดชุดคำถามนั้นและแสดงข้อที่ค้างไว้
        try {
            // ต้องโหลดโมดูลคำถามก่อนที่จะแสดงคำถาม
            let module;
            switch (savedProgress.selectedQuizType) {
                case 'civil_servant_act':
                    module = await import('./data/civil_servant_act.js');
                    questions = module.civilServantActQuestions;
                    break;
                case 'pdpa_act':
                    module = await import('./data/pdpa_act.js');
                    questions = module.pdpaActQuestions;
                    break;
                case 'moe_act':
                    module = await import('./data/moe_act.js');
                    questions = module.moeActQuestions;
                    break;
                case 'good_governance_act':
                    module = await import('./data/good_governance_act.js');
                    questions = module.goodGovernanceActQuestions;
                    break;
                case 'tort_liability_act':
                    module = await import('./data/tort_liability_act.js');
                    questions = module.tortLiabilityActQuestions;
                    break;
                case 'admin_org_act':
                    module = await import('./data/admin_org_act.js');
                    questions = module.adminOrgActQuestions;
                    break;
                case 'leave_regulations':
                    module = await import('./data/leave_regulations.js');
                    questions = module.leaveRegulationsQuestions;
                    break;
                case 'all_acts_random':
                    // สำหรับ 'all_acts_random' ต้องโหลดทั้งหมดและสุ่มใหม่ (ไม่สามารถจำลำดับการสุ่มเดิมได้ง่ายๆ)
                    // ดังนั้นจะถือว่าเป็นการเริ่มต้นใหม่สำหรับประเภทนี้หากโหลดจาก localStorage
                    // หรือจะปรับ logic ให้ซับซ้อนขึ้นเพื่อบันทึกลำดับคำถามที่สุ่มไว้
                    // ในที่นี้จะให้เริ่มใหม่สำหรับ 'all_acts_random' เพื่อความง่าย
                    showMessage('ไม่สามารถโหลดความคืบหน้าของ "สุ่มรวม พ.ร.บ. ทั้งหมด" ได้ กรุณาเลือกใหม่', 'info');
                    resetQuiz(false);
                    return;
                default:
                    console.error("ไม่รู้จักประเภทข้อสอบที่บันทึกไว้:", savedProgress.selectedQuizType);
                    resetQuiz(false);
                    return;
            }
            // หากโหลดคำถามสำเร็จ ให้แสดงหน้าจอทำข้อสอบ
            document.getElementById('homeScreen').style.display = 'none';
            document.getElementById('quizScreen').style.display = 'block';
            questionCounterElement.style.display = 'block'; // แสดงตัวนับข้อสอบ
            displayQuestion(); // แสดงคำถามที่บันทึกไว้
        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการโหลดโมดูลคำถามจาก localStorage:", error);
            showMessage('ไม่สามารถโหลดชุดข้อสอบที่บันทึกไว้ได้', 'error');
            resetQuiz(false); // หากมีข้อผิดพลาดในการโหลด ให้รีเซ็ต
        }
    } else {
        // หากไม่มีความคืบหน้า ให้แสดงหน้าจอเลือก พ.ร.B.
        document.getElementById('homeScreen').style.display = 'block';
        document.getElementById('quizScreen').style.display = 'none';
        document.getElementById('resultScreen').style.display = 'none';
        questionCounterElement.style.display = 'none';
    }
});
