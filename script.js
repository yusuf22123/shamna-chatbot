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
    text = text.replace(/أ|إ|آ/g, "ا");
    text = text.replace("بيتزا", "بيتزا ").replace("وجبة", "وجبة ");
    text = text.replace(/[^ء-ي0-9\s]/g, ""); // إزالة أي حروف أو رموز غريبة
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
        let itemWords = normalizedItem.split(" ");
        let allWordsFound = itemWords.every(word => normalizedText.includes(word));
        if (allWordsFound) {
            items.push(item);
            if (normalizedText.includes("بدون") || normalizedText.includes("من غير")) {
                let extra = normalizedText.split("بدون")[1] || normalizedText.split("من غير")[1];
                details[item] = `بدون ${extra.trim()}`;
            }
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
    displayMessage("مرحبًا بيك في مطعم شامنا! 😊\nاختار الأصناف من القايمة تحت، أو اكتب 'طلب' لو عايز تكتب بنفسك!", "bot");
};

// دالة لإضافة صنف من القايمة
function addItem() {
    const itemSelect = document.getElementById("item-select");
    const selectedItem = itemSelect.value;
    if (selectedItem && !selectedItems.includes(selectedItem)) {
        selectedItems.push(selectedItem);
        displayMessage(`تم إضافة: ${selectedItem}`, "user");
        displayMessage(`اختارت ${selectedItems.join("، ")}. عايز تضيف حاجة تانية؟ اضغط إرسال لما تخلّص!`, "bot");
    }
    itemSelect.value = "";
}

// دالة لمعالجة الرسائل
function sendMessage() {
    const userInput = document.getElementById("user-message");
    const userMessage = userInput.value.trim();

    if (!userMessage && selectedItems.length === 0) return;

    if (userMessage) {
        displayMessage(userMessage, "user");
        userInput.value = "";
    }

    const normalizedInput = normalizeText(userMessage);

    if (normalizedInput.includes("المنيو")) {
        displayMessage("المنيو موجودة فوق! 📋 تقدر تشوفها وتختار الأصناف من القايمة تحت.", "bot");
        state = "waiting_for_items";
        return;
    }

    if (normalizedInput.includes("طلب") || normalizedInput.includes("عايز اطلب اكل") || normalizedInput.includes("اطلب ايه")) {
        displayMessage("تمام! اختار الأصناف من القايمة تحت، أو اكتب الأصناف بنفسك (مثلاً: شيش بالطين بدون بصل، بيتزا شاورما)", "bot");
        state = "waiting_for_items";
        return;
    }

    if (state === "waiting_for_items") {
        if (selectedItems.length > 0 && (!userMessage || normalizedInput === "تم")) {
            state = "waiting_for_quantities";
            displayMessage(`تمام، عايز كام ${selectedItems.join("، ")}؟ اكتب الكميات (مثلاً: 1 لكل صنف، أو 1 شيش بالطين، 2 بيتزا شاورما)`, "bot");
            return;
        }

        const { items, details } = findItemsInText(userMessage);
        if (items.length > 0) {
            selectedItems = items;
            order.details = details;
            state = "waiting_for_quantities";
            displayMessage(`تمام، عايز كام ${items.join("، ")}؟ اكتب الكميات (مثلاً: 1 لكل صنف، أو 1 شيش بالطين، 2 بيتزا شاورما)`, "bot");
        } else {
            displayMessage("مش فاهم طلبك، ممكن تكتب الأصناف اللي عايزها (زي شيش بالطين، بيتزا شاورما) أو تختار من القايمة تحت؟", "bot");
        }
        return;
    }

    if (state === "waiting_for_quantities") {
        const quantities = {};
        const normalizedInput = normalizeText(userMessage);
        const words = normalizedInput.split(" ");

        // محاولة استخراج الكميات من النص
        let currentQuantity = 1; // افتراضيًا 1 لو مفيش كمية
        for (let i = 0; i < words.length; i++) {
            if (!isNaN(words[i])) {
                currentQuantity = parseInt(words[i]);
                // ابحث عن الصنف في الكلمات التالية
                let found = false;
                for (let item of selectedItems) {
                    let normalizedItem = normalizeText(item);
                    let itemWords = normalizedItem.split(" ");
                    let itemFound = itemWords.every(word => normalizedInput.includes(word));
                    if (itemFound) {
                        quantities[item] = currentQuantity;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // لو مفيش صنف محدد، نضيف الكمية للصنف الحالي
                    let index = Object.keys(quantities).length;
                    if (index < selectedItems.length) {
                        quantities[selectedItems[index]] = currentQuantity;
                    }
                }
            }
        }

        // لو مفيش كميات محددة، نعتبر الكمية 1 لكل صنف
        for (let item of selectedItems) {
            if (!quantities[item]) {
                quantities[item] = 1;
            }
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
            displayMessage("تم تسجيل طلبك! هيوصلك خلال 30 دقيقة. شكرًا على طلبك! 😊\nعايز تطلب حاجة تانية؟ اختار من القايمة أو اكتب 'طلب'", "bot");
            state = "waiting_for_items";
            selectedItems = [];
            order = {};
        } else if (normalizedInput.includes("لأ")) {
            displayMessage("تمام، الطلب اتلغى. عايز تطلب حاجة تانية؟ اختار من القايمة أو اكتب 'طلب'", "bot");
            state = "waiting_for_items";
            selectedItems = [];
            order = {};
        } else {
            displayMessage("ممكن تكتب 'أيوة' أو 'لأ' عشان تؤكد أو تلغي الطلب؟", "bot");
        }
        return;
    }

    displayMessage("مش فاهم طلبك، ممكن تكتب 'طلب' أو تختار الأصناف من القايمة تحت؟", "bot");
}

document.getElementById("user-message").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
