from flask import Flask, render_template, request, jsonify
import spacy
import spacy.cli
import re

app = Flask(__name__)

# تحميل نموذج اللغة العربية من spaCy
nlp = spacy.load("ar_core_news_sm")

# قايمة المنيو
menu = {
    "شيش بالطين": 170,
    "إسكالوب دجاج": 180,
    "وجبة نابيك": 180,
    "وجبة فاهيتا": 180,
    "وجبة فرانشيسكو": 180,
    "وجبة سوزي": 180,
    "وجبة شامنا": 180,
    "وجبة جوليان": 180,
    "بيتزا مارجريتا": {"صغيرة": 100, "كبيرة": 140},
    "بيتزا فور سيزونز": {"صغيرة": 100, "كبيرة": 140},
    "بيتزا شاورما": {"صغيرة": 120, "كبيرة": 160},
    "بيتزا بيبروني": {"صغيرة": 140, "كبيرة": 180}
}
delivery_fee = 20

# دالة لتنظيف النص
def normalize_text(text):
    text = text.lower()
    text = text.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    text = text.strip()
    return text

# دالة لاستخراج الأصناف والكميات والتفاصيل باستخدام spaCy
def find_items_in_text(text):
    normalized_text = normalize_text(text)
    doc = nlp(normalized_text)
    
    items = []
    quantities = {}
    details = {}
    
    # استخراج الكميات
    for token in doc:
        if token.like_num:  # لو الكلمة رقم
            quantity = int(token.text)
            # ابحث عن الصنف في الكلمات التالية
            remaining_text = " ".join([t.text for t in doc[token.i + 1:]])
            found_item = None
            best_score = 0
            for item in menu:
                item_doc = nlp(normalize_text(item))
                score = doc.similarity(item_doc)
                if score > 0.8 and score > best_score:  # 80% تشابه على الأقل
                    found_item = item
                    best_score = score
            if found_item:
                items.append(found_item)
                quantities[found_item] = quantity
                # ابحث عن تفاصيل (مثل "بدون جبن")
                if "بدون" in normalized_text or "من غير" in normalized_text:
                    extra = normalized_text.split("بدون")[-1] or normalized_text.split("من غير")[-1]
                    details[found_item] = f"بدون {extra.strip()}"

    # لو مفيش كميات، ابحث عن الأصناف بس
    if not items:
        for item in menu:
            item_doc = nlp(normalize_text(item))
            score = doc.similarity(item_doc)
            if score > 0.8:  # 80% تشابه على الأقل
                items.append(item)
                quantities[item] = 1
                if "بدون" in normalized_text or "من غير" in normalized_text:
                    extra = normalized_text.split("بدون")[-1] or normalized_text.split("من غير")[-1]
                    details[item] = f"بدون {extra.strip()}"

    return items, quantities, details

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message')
    state = request.json.get('state', 'waiting_for_items')
    selected_items = request.json.get('selected_items', [])
    order = request.json.get('order', {})

    normalized_input = normalize_text(user_message)

    if "المنيو" in normalized_input:
        return jsonify({
            "response": "المنيو موجودة فوق! 📋 تقدر تشوفها وتختار الأصناف من القايمة تحت.",
            "state": "waiting_for_items",
            "selected_items": selected_items,
            "order": order
        })

    if "طلب" in normalized_input or "عايز اطلب اكل" in normalized_input or "اطلب ايه" in normalized_input:
        return jsonify({
            "response": "تمام! اكتب الأصناف اللي عايزها (مثلاً: عايز بيتزا شاورما بدون جبن) أو اختار من القايمة تحت!",
            "state": "waiting_for_items",
            "selected_items": selected_items,
            "order": order
        })

    if state == "waiting_for_items":
        if selected_items and (not user_message or normalized_input == "تم"):
            return jsonify({
                "response": f"تمام، عايز كام {', '.join(selected_items)}؟ اكتب الكميات (مثلاً: 1 لكل صنف، أو 1 شيش بالطين، 2 بيتزا شاورما)",
                "state": "waiting_for_quantities",
                "selected_items": selected_items,
                "order": order
            })

        items, quantities, details = find_items_in_text(user_message)
        if items:
            selected_items = items
            order["quantities"] = quantities
            order["details"] = details

            # تحقق لو الصنف فيه أحجام (مثلاً بيتزا)
            for item in selected_items:
                if isinstance(menu[item], dict):  # لو الصنف فيه أحجام
                    return jsonify({
                        "response": f"عايز {item} صغيرة ولا كبيرة؟",
                        "state": "waiting_for_size",
                        "selected_items": selected_items,
                        "order": order
                    })

            total_cost = 0
            order_details = []
            for item in selected_items:
                cost = menu[item] * quantities[item]
                total_cost += cost
                extra = details.get(item, "")
                order_details.append(f"{quantities[item]} {item} {extra} ({cost} جنيه)")

            total_cost_with_delivery = total_cost + delivery_fee
            order_summary = " + ".join(order_details)
            order["summary"] = order_summary
            order["total"] = total_cost_with_delivery

            return jsonify({
                "response": f"طلبك: {order_summary}. الإجمالي: {total_cost} جنيه + {delivery_fee} جنيه توصيل = {total_cost_with_delivery} جنيه. تؤكد الطلب؟ (اكتب 'أيوة' أو 'لأ')",
                "state": "waiting_for_confirmation",
                "selected_items": selected_items,
                "order": order
            })
        else:
            return jsonify({
                "response": "مش فاهم طلبك! ممكن تكتب الأصناف زي 'عايز بيتزا شاورما' أو تختار من القايمة تحت؟",
                "state": "waiting_for_items",
                "selected_items": selected_items,
                "order": order
            })

    if state == "waiting_for_quantities":
        items, quantities, details = find_items_in_text(user_message)
        if not quantities:
            quantities = {item: 1 for item in selected_items}
        else:
            for item in selected_items:
                if item not in quantities:
                    quantities[item] = 1

        order["quantities"] = quantities
        order["details"] = details

        # تحقق لو الصنف فيه أحجام
        for item in selected_items:
            if isinstance(menu[item], dict):
                return jsonify({
                    "response": f"عايز {item} صغيرة ولا كبيرة؟",
                    "state": "waiting_for_size",
                    "selected_items": selected_items,
                    "order": order
                })

        total_cost = 0
        order_details = []
        for item in selected_items:
            cost = menu[item] * quantities[item]
            total_cost += cost
            extra = order.get("details", {}).get(item, "")
            order_details.append(f"{quantities[item]} {item} {extra} ({cost} جنيه)")

        total_cost_with_delivery = total_cost + delivery_fee
        order_summary = " + ".join(order_details)
        order["summary"] = order_summary
        order["total"] = total_cost_with_delivery

        return jsonify({
            "response": f"طلبك: {order_summary}. الإجمالي: {total_cost} جنيه + {delivery_fee} جنيه توصيل = {total_cost_with_delivery} جنيه. تؤكد الطلب؟ (اكتب 'أيوة' أو 'لأ')",
            "state": "waiting_for_confirmation",
            "selected_items": selected_items,
            "order": order
        })

    if state == "waiting_for_size":
        sizes = ["صغيرة", "كبيرة"]
        size = None
        for s in sizes:
            if s in normalized_input:
                size = s
                break

        if size:
            order["sizes"] = order.get("sizes", {})
            for item in selected_items:
                if isinstance(menu[item], dict):
                    order["sizes"][item] = size

            total_cost = 0
            order_details = []
            for item in selected_items:
                if isinstance(menu[item], dict):
                    cost = menu[item][order["sizes"][item]] * order["quantities"][item]
                else:
                    cost = menu[item] * order["quantities"][item]
                total_cost += cost
                extra = order.get("details", {}).get(item, "")
                size_text = f"({order['sizes'][item]})" if item in order["sizes"] else ""
                order_details.append(f"{order['quantities'][item]} {item} {size_text} {extra} ({cost} جنيه)")

            total_cost_with_delivery = total_cost + delivery_fee
            order_summary = " + ".join(order_details)
            order["summary"] = order_summary
            order["total"] = total_cost_with_delivery

            return jsonify({
                "response": f"طلبك: {order_summary}. الإجمالي: {total_cost} جنيه + {delivery_fee} جنيه توصيل = {total_cost_with_delivery} جنيه. تؤكد الطلب؟ (اكتب 'أيوة' أو 'لأ')",
                "state": "waiting_for_confirmation",
                "selected_items": selected_items,
                "order": order
            })
        else:
            return jsonify({
                "response": "ممكن تكتب 'صغيرة' أو 'كبيرة'؟",
                "state": "waiting_for_size",
                "selected_items": selected_items,
                "order": order
            })

    if state == "waiting_for_confirmation":
        if "أيوة" in normalized_input:
            return jsonify({
                "response": "تم تسجيل طلبك! هيوصلك خلال 30 دقيقة. شكرًا على طلبك! 😊\nعايز تطلب حاجة تانية؟ اختار من القايمة أو اكتب 'طلب'",
                "state": "waiting_for_items",
                "selected_items": [],
                "order": {}
            })
        elif "لأ" in normalized_input:
            return jsonify({
                "response": "تمام، الطلب اتلغى. عايز تطلب حاجة تانية؟ اختار من القايمة أو اكتب 'طلب'",
                "state": "waiting_for_items",
                "selected_items": [],
                "order": {}
            })
        else:
            return jsonify({
                "response": "ممكن تكتب 'أيوة' أو 'لأ' عشان تؤكد أو تلغي الطلب؟",
                "state": "waiting_for_confirmation",
                "selected_items": selected_items,
                "order": order
            })

    return jsonify({
        "response": "مش فاهم طلبك، ممكن تكتب 'طلب' أو تختار الأصناف من القايمة تحت؟",
        "state": "waiting_for_items",
        "selected_items": selected_items,
        "order": order
    })

if __name__ == '__main__':
    import os
    port = int(os.getenv("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
