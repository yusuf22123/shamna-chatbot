document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const menuItems = document.querySelectorAll('.menu-item');
    let state = 'waiting_for_items';
    let selectedItems = [];
    let order = {};

    // إضافة رسالة للشات
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // إرسال رسالة للـ Backend
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message && state !== 'waiting_for_quantities') return;

        addMessage(message, 'user');
        userInput.value = '';

        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                state: state,
                selected_items: selectedItems,
                order: order
            })
        });

        const data = await response.json();
        addMessage(data.response, 'bot');
        state = data.state;
        selectedItems = data.selected_items;
        order = data.order;
    }

    // إرسال رسالة بضغطة زر
    sendButton.addEventListener('click', sendMessage);

    // إرسال رسالة بضغطة Enter
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // اختيار الأصناف من القايمة
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const itemName = item.textContent.split(' - ')[0];
            selectedItems.push(itemName);
            addMessage(`اخترت: ${itemName}`, 'user');
            addMessage(`تمام، اخترت ${itemName}. عايز حاجة تانية؟ اكتب 'تم' لو خلّصت.`, 'bot');
        });
    });

    // رسالة ترحيب
    addMessage('مرحبًا! أنا بوت مطعم شامنا. اكتب "طلب" عشان تبدأ، أو اختار من القايمة تحت!', 'bot');
});
