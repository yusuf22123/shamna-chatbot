// قايمة المنيو
const menu = {
    "شيش بالطين": 170,
    "إسكالوب دجاج": 180,
    "وجبة نابيك": 180,
    "وجبة فاهيتا": 180,
    "وجبة فرانشيسكو": 180,
    "وجبة سوزي": 180,
    "وجبة شامنا": 180,
    "وجبة جوليان": 180,
    "بيتزا مارجريتا": 140,
    "بيتزا فور سيزونز": 140,
    "بيتزا شاورما": 160,
    "بيتزا بيبروني": 180
};
const deliveryFee = 20;

let state = "waiting_for_items";
let selectedItems = [];
let order = {};

// دالة لتنظيف النص وتوحيده
function normalizeText(text) {
    text = text.toLowerCase();
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا");
    text = text.replace("بيتزا", "بيتزا ").replace("وجبة", "وجبة ");
    text = text.trim();
    return text;
}

// دالة للبحث عن الأصناف والتفاصيل في النص
function findItemsInText(text) {
    const normalizedText = normalizeText(text);
    let items = [];
    let details = {};
    for (let item in menu) {
        let normalizedItem = normalizeText(item);
        if (normalizedText.includes(normalizedItem)) {
            items.push(item);
            if (normalizedText.includes("بدون") || normalizedText.includes("من غير")) {
                let extra = normalizedText.split("بدون")[1] || normalizedText.split("من غير")[1];
                details[item] = `بدون ${extra.trim()}`;
            }
        } else if (normalizedText.includes("شاورما") && normalizedText.includes("بيتزا") && item === "بيتزا شاورما") {
            items.push(item);
        } else if (normalizedText.includes("مارجريتا") && normalizedText.includes("بيتزا") && item === "بيتزا مارجريتا") {
            items.push(item);
        } else if (normalizedText.includes("فور سيزونز") && normalizedText.includes("بيتزا") && item === "بيتزا فور سيزونز") {
            items.push(item);
        } else if (normalizedText.includes("بيبروني") && normalizedText.includes("بيتزا") && item === "بيتزا بيبروني") {
            items.push(item);
        }
    }
    return { items, details };
}

// دالة لعرض الرسائل
function displayMessage(message, sender) {
    const chatBox = document.getElementById("chat-box");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    messageDiv.textContent = message;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// الرسالة الترحيبية
window.onload = function() {
    displayMessage("مرحبًا بيك في مطعم شامنا! 😊\nعايز تطلب أكل؟ اكتب 'طلب' أو 'عايز أطلب أكل'\nعايز تشوف المنيو؟ اكتب 'المنيو'", "bot");
};

// دالة لمعالجة الرسائل
function sendMessage() {
    const userInput = document.getElementById("user-message");
    const userMessage = userInput.value.trim();
    if (!userMessage) return;

    displayMessage(userMessage, "user");
    userInput.value = "";

    const normalizedInput = normalizeText(userMessage);

    if (normalizedInput.includes("المنيو")) {
        displayMessage("المنيو موجودة فوق! 📋 تقدر تشوفها وتكتب الأصناف اللي عايزها هنا.", "bot");
        state = "waiting_for_items";
        return;
    }

    if (normalizedInput.includes("طلب") || normalizedInput.includes("عايز اطلب اكل") || normalizedInput.includes("اطلب ايه")) {
        displayMessage("تمام! اكتب الأصناف اللي عايزها (مثلاً: شيش بالطين بدون بصل، بيتزا شاورما)", "bot");
        state = "waiting_for_items";
        return;
    }

    if (state === "waiting_for_items") {
        const { items, details } = findItemsInText(userMessage);
        if (items.length > 0) {
            selectedItems = items;
            order.details = details;
            state = "waiting_for_quantities";
            displayMessage(`تمام، عايز كام ${items.join("، ")}؟ (مثلاً: 1 شيش بالطين، 2 بيتزا شاورما)`, "bot");
        } else {
            displayMessage("مش فاهم طلبك، ممكن تكتب الأصناف اللي عايزها (زي شيش بالطين، بيتزا شاورما)؟", "bot");
        }
        return;
    }

    if (state === "waiting_for_quantities") {
        const quantities = {};
        const normalizedInput = normalizeText(userMessage);
        for (let item of selectedItems) {
            let found = false;
            for (let word of normalizedInput.split(" ")) {
                if (!isNaN(word)) {
                    quantities[item] = parseInt(word);
                    found = true;
                    break;
                }
            }
            if (!found) quantities[item] = 1;
        }

        let totalCost = 0;
        const orderDetails = [];
        for (let item in quantities) {
            const cost = menu[item] * quantities[item];
            totalCost += cost;
            const extra = order.details[item] || "";
            orderDetails.push(`${quantities[item]} ${item} ${extra} (${cost} جنيه)`);
        }

        const totalCostWithDelivery = totalCost + deliveryFee;
        const orderSummary = orderDetails.join(" + ");
        order.summary = orderSummary;
        order.total = totalCostWithDelivery;
        state = "waiting_for_confirmation";

        displayMessage(`طلبك: ${orderSummary}. الإجمالي: ${totalCost} جنيه + ${deliveryFee} جنيه توصيل = ${totalCostWithDelivery} جنيه. تؤكد الطلب؟ (اكتب 'أيوة' أو 'لأ')`, "bot");
        return;
    }

    if (state === "waiting_for_confirmation") {
        if (normalizedInput.includes("أيوة")) {
            displayMessage("تم تسجيل طلبك! هيوصلك خلال 30 دقيقة. شكرًا على طلبك! 😊\nعايز تطلب حاجة تانية؟ اكتب 'طلب'", "bot");
            state = "waiting_for_items";
            selectedItems = [];
            order = {};
        } else if (normalizedInput.includes("لأ")) {
            displayMessage("تمام، الطلب اتلغى. عايز تطلب حاجة تانية؟ اكتب 'طلب'", "bot");
            state = "waiting_for_items";
            selectedItems = [];
            order = {};
        } else {
            displayMessage("ممكن تكتب 'أيوة' أو 'لأ' عشان تؤكد أو تلغي الطلب؟", "bot");
        }
        return;
    }

    displayMessage("مش فاهم طلبك، ممكن تكتب 'طلب' أو 'عايز أطلب أكل' عشان نبدأ؟\nعايز تشوف المنيو؟ اكتب 'المنيو'", "bot");
}

document.getElementById("user-message").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
