from flask import Flask, render_template, request, redirect, url_for, jsonify
from services2.status_service2 import get_customer_status, update_customer_status

app = Flask(__name__, template_folder="services2/templates")


@app.route("/status/<public_ref>")
def status_view(public_ref):
    result = get_customer_status(public_ref)

    if "error" in result:
        error_msg = result["error"]
        if error_msg == "Customer not found":
            return error_msg, 404
        else:
            return error_msg, 500

    return render_template(
        "status.html",
        status=result["status"],
        position=result["position"],
        eta=result["etaMinutes"]
    )

@app.post("/staff/status-update")
def staff_status_update():
    public_ref = None
    new_status = None

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        public_ref = payload.get("public_ref") or payload.get("publicRef")
        new_status = payload.get("status") or payload.get("new_status") or payload.get("newStatus")
    else:
        public_ref = request.form.get("public_ref") or request.form.get("publicRef")
        new_status = request.form.get("status") or request.form.get("new_status") or request.form.get("newStatus")

    result = update_customer_status(public_ref, new_status)

    if "error" in result:
        msg = result["error"]
        if msg == "Customer not found":
            code = 404
        elif msg in {"Missing public_ref", "Missing status", "Invalid status", "Transition not allowed"}:
            code = 400
        else:
            code = 500

        if request.is_json or request.accept_mimetypes.best == "application/json":
            return jsonify(result), code
        return msg, code

    status_result = get_customer_status(public_ref)
    merged = {**result, **({} if "error" in status_result else status_result)}

    if request.is_json or request.accept_mimetypes.best == "application/json":
        return jsonify(merged), 200

    return redirect(url_for("status_view", public_ref=public_ref))


if __name__ == "__main__":
    app.run(debug=True)
