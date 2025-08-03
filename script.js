// ตรวจสอบการโหลดไฟล์: ข้อความนี้จะปรากฏใน Console ทันทีที่ไฟล์นี้ถูกโหลด
console.log("ไฟล์ script.js ถูกโหลดและกำลังทำงาน!");

// ประกาศตัวแปร questions เป็นแบบ let เพื่อให้สามารถกำหนดค่าใหม่ได้
let questions = [];

let currentQuestionIndex = 0;
let score = 0;
let selectedOptionButton = null;
let quizCompleted = false;

// รับ Element ของตัวนับข้อสอบ
const questionCounterElement = document.getElementById('questionCounter');

// ฟังก์ชันสำหรับสุ่มลำดับของ Array (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// ฟังก์ชันสำหรับโหลดคำถามจากไฟล์ภายนอก
async function loadQuestions(quizType) {
    let module;
    try {
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
            questions = [
                ...civilServantModule.civilServantActQuestions,
                ...pdpaModule.pdpaActQuestions,
                ...moeModule.moeActQuestions,
                ...goodGovernanceModule.goodGovernanceActQuestions,
                ...tortLiabilityModule.tortLiabilityActQuestions,
                ...adminOrgModule.adminOrgActQuestions,
                ...leaveRegulationsModule.leaveRegulationsQuestions
            ];
            
            // สุ่มคำถามทั้งหมด
            questions = shuffleArray(questions);

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
                    return;
            }
            // สุ่มคำถามสำหรับ พ.ร.บ. ที่เลือก
            questions = shuffleArray(questions);
        }

        console.log(`โหลดคำถามสำหรับ ${quizType} สำเร็จ! มี ${questions.length} ข้อ`);
        
        // รีเซ็ตสถานะข้อสอบ
        currentQuestionIndex = 0;
        score = 0;
        quizCompleted = false;
        selectedOptionButton = null;
        
        // ซ่อนหน้าจอเลือก พ.ร.บ. (homeScreen) และแสดงหน้าจอทำข้อสอบ (quizScreen) ทันที
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('quizScreen').style.display = 'block';
        questionCounterElement.style.display = 'block'; // แสดงตัวนับข้อสอบ
        showQuestion(currentQuestionIndex); // แสดงคำถามข้อแรก
        
        closeNav(); // ปิด sidebar หลังจากเลือก พ.ร.บ.
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดคำถาม:", error);
        alert("ไม่สามารถโหลดคำถามได้ กรุณาลองใหม่อีกครั้ง");
        questions = []; // เคลียร์คำถามหากโหลดไม่สำเร็จ
    }
}

// ฟังก์ชันสำหรับแสดงคำถาม
function showQuestion(index) {
    if (questions.length === 0) {
        alert("ยังไม่มีคำถามให้ทำ กรุณาเลือก พ.ร.บ. ก่อน");
        document.getElementById('quizScreen').style.display = 'none';
        document.getElementById('homeScreen').style.display = 'block'; // กลับไปหน้าเลือก พ.ร.บ.
        questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบ
        return;
    }
    if (index >= questions.length) {
        displayResult();
        return;
    }

    const questionData = questions[index];
    const cleanQuestionText = questionData.question.replace(/^\d+\.\s*/, '');
    document.getElementById('questionText').innerText = (index + 1) + ". " + cleanQuestionText;
    
    // อัปเดตตัวนับข้อสอบ
    questionCounterElement.innerText = `ข้อที่ ${index + 1} จาก ${questions.length}`;

    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    optionsContainer.style.pointerEvents = 'auto';

    document.getElementById('feedbackContainer').style.display = 'none';
    document.getElementById('nextButton').style.display = 'none';

    questionData.options.forEach((option, i) => {
        const button = document.createElement('button');
        button.innerText = option;
        button.classList.add('option-button');
        
        button.addEventListener('click', () => {
            if (selectedOptionButton === null) {
                selectedOptionButton = button;
                checkAnswer(i, questionData.answer, questionData.reason, button);
            }
        });
        optionsContainer.appendChild(button);
    });
}

// ฟังก์ชันสำหรับตรวจคำตอบ
function checkAnswer(selectedIndex, correctAnswerIndex, reason, clickedButton) {
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.style.pointerEvents = 'none';

    Array.from(optionsContainer.children).forEach(button => {
        button.classList.remove('correct', 'wrong');
    });

    const feedbackTextElement = document.getElementById('feedbackText');
    const explanationTextElement = document.getElementById('explanationText');
    const feedbackContainer = document.getElementById('feedbackContainer');

    feedbackTextElement.classList.remove('correct-feedback', 'wrong-feedback');

    if (selectedIndex === correctAnswerIndex) {
        score++;
        clickedButton.classList.add('correct');
        feedbackTextElement.innerText = "ถูกต้อง!";
        feedbackTextElement.classList.add('correct-feedback');
    } else {
        clickedButton.classList.add('wrong');
        Array.from(optionsContainer.children).forEach((button, i) => {
            if (i === correctAnswerIndex) {
                button.classList.add('correct');
            }
        });
        const cleanQuestionTextForFeedback = questions[currentQuestionIndex].question.replace(/^\d+\.\s*/, '');
        feedbackTextElement.innerText = "ผิด! คำตอบที่ถูกต้องคือ " + questions[currentQuestionIndex].options[correctAnswerIndex] + "\n" + cleanQuestionTextForFeedback;
        feedbackTextElement.classList.add('wrong-feedback');
    }

    explanationTextElement.innerText = reason;
    feedbackContainer.style.display = 'block';

    document.getElementById('nextButton').style.display = 'block';
}

// ฟังก์ชันสำหรับแสดงผลคะแนน
function displayResult() {
    quizCompleted = true;
    document.getElementById('quizScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
    questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบเมื่อแสดงผลลัพธ์
    document.getElementById('scoreDisplay').innerText = `คุณได้คะแนน ${score} จาก ${questions.length} ข้อ`;
}

// ฟังก์ชันสำหรับเริ่มทำข้อสอบใหม่ (กลับไปหน้าเลือก พ.ร.บ.)
function restartQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    quizCompleted = false;
    selectedOptionButton = null;
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('homeScreen').style.display = 'block'; // กลับไปหน้าเลือก พ.ร.บ.
    questionCounterElement.style.display = 'none'; // ซ่อนตัวนับข้อสอบ
    closeNav();
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

// Function to apply theme
function applyTheme(theme) {
    if (theme === 'dark') {
        body.classList.add('dark-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for dark theme
    } else {
        body.classList.remove('dark-theme');
        themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for light theme
    }
}


// --- Event Listeners ---

// เมื่อ DOM โหลดเสร็จ ให้แนบ Event Listeners กับปุ่มต่างๆ
document.addEventListener('DOMContentLoaded', (event) => {
    // Check for saved theme on load
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to light theme if no preference saved
        applyTheme('light');
    }

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

    // Event Listener สำหรับปุ่ม "ข้อต่อไป"
    document.getElementById('nextButton').addEventListener('click', function() {
        console.log("ปุ่ม 'ข้อต่อไป' ถูกกดแล้ว!");
        selectedOptionButton = null;
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    });

    // Event Listener สำหรับปุ่ม "ทำข้อสอบอีกครั้ง"
    document.getElementById('restartButton').addEventListener('click', restartQuiz);

    // Event Listener สำหรับปุ่ม Login/Logout ใน Sidebar (ยังไม่มีฟังก์ชันจริง)
    document.getElementById('sidebarLogoutBtn').addEventListener('click', function() {
        alert("ยังไม่มีระบบ Logout จริงจัง! จะพัฒนาในขั้นตอนถัดไป");
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
});
