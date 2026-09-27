import hashlib
import hmac
import urllib.parse
from typing import Dict, Any, Optional

# Cấu hình Ngân hàng nhận tiền thật VietQR (Vietcombank chính chủ)
DEFAULT_BANK_ID = "VCB"          # Vietcombank (Ngân hàng TMCP Ngoại thương Việt Nam)
DEFAULT_ACCOUNT_NO = "1045947985" # Số tài khoản nhận tiền thật
DEFAULT_ACCOUNT_NAME = "KIEN VAN TRUC" # Tên chủ tài khoản chính chủ

class VietQRService:
    """
    Dịch vụ sinh mã QR chuyển khoản ngân hàng chuẩn NAPAS 247 qua VietQR.io API.
    Miễn phí, chuẩn xác 100%, tự động điền Số tiền, STK và Nội dung chuyển khoản.
    """
    @staticmethod
    def generate_qr(
        amount: float,
        order_id: int,
        bank_id: str = DEFAULT_BANK_ID,
        account_no: str = DEFAULT_ACCOUNT_NO,
        account_name: str = DEFAULT_ACCOUNT_NAME
    ) -> Dict[str, Any]:
        memo = f"DH{order_id}"
        encoded_memo = urllib.parse.quote(memo)
        encoded_name = urllib.parse.quote(account_name)
        amount_int = int(amount)

        # URL hình ảnh VietQR chuẩn Napas247 (compact2 template)
        qr_url = f"https://img.vietqr.io/image/{bank_id}-{account_no}-compact2.png?amount={amount_int}&addInfo={encoded_memo}&accountName={encoded_name}"
        
        return {
            "provider": "vietqr",
            "bank_id": bank_id,
            "account_no": account_no,
            "account_name": account_name,
            "amount": amount_int,
            "memo": memo,
            "qr_code_url": qr_url,
            "payment_url": qr_url,
            "instructions": f"Quét mã QR bằng ứng dụng ngân hàng (MB, Vietcombank, Techcombank...). Nội dung chuyển khoản: {memo}"
        }

class MoMoService:
    """
    Dịch vụ tích hợp Cổng thanh toán Ví MoMo (MoMo Payment Gateway).
    """
    @staticmethod
    def generate_payment(amount: float, order_id: int, transaction_id: str) -> Dict[str, Any]:
        amount_int = int(amount)
        # Sử dụng API Quick QR cho MoMo
        momo_qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=2|99|0988888888|MOMO|HE%20THONG%20BAN%20HANG|0|0|{amount_int}|DH{order_id}|transfer_myqr"
        
        return {
            "provider": "momo",
            "amount": amount_int,
            "transaction_id": transaction_id,
            "qr_code_url": momo_qr_url,
            "payment_url": f"https://test-payment.momo.vn/pay/DH{order_id}",
            "instructions": f"Quét mã QR bằng ứng dụng Ví MoMo để chuyển khoản {amount_int:,} VNĐ. Lời nhắn: DH{order_id}"
        }

class VNPayService:
    """
    Dịch vụ tích hợp Cổng thanh toán VNPay Sandbox & Production.
    """
    @staticmethod
    def generate_payment_url(
        amount: float,
        order_id: int,
        transaction_id: str,
        tmn_code: str = "DEMOVNPAY",
        secret_key: str = "SECRETKEYDEMOVNPAY",
        vnp_url: str = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
    ) -> Dict[str, Any]:
        amount_int = int(amount * 100) # VNPay yêu cầu nhân 100
        order_info = f"Thanh toan don hang #{order_id}"
        
        params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": tmn_code,
            "vnp_Amount": str(amount_int),
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": transaction_id,
            "vnp_OrderInfo": order_info,
            "vnp_OrderType": "other",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": f"http://localhost:5173/orders/{order_id}/success"
        }
        
        sorted_params = sorted(params.items())
        query_string = urllib.parse.urlencode(sorted_params)
        
        # Sinh chữ ký HMAC-SHA512
        hash_value = hmac.new(
            secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        payment_url = f"{vnp_url}?{query_string}&vnp_SecureHash={hash_value}"
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={urllib.parse.quote(payment_url)}"
        
        return {
            "provider": "vnpay",
            "amount": int(amount),
            "transaction_id": transaction_id,
            "payment_url": payment_url,
            "qr_code_url": qr_url,
            "instructions": "Chuyển hướng đến Cổng thanh toán VNPay (ATM / QR / Visa / MasterCard)"
        }

class CODService:
    """
    Dịch vụ Thanh toán khi nhận hàng (Cash On Delivery).
    """
    @staticmethod
    def generate_payment(amount: float, order_id: int) -> Dict[str, Any]:
        return {
            "provider": "cod",
            "amount": int(amount),
            "payment_url": None,
            "qr_code_url": None,
            "instructions": "Thanh toán bằng tiền mặt trực tiếp cho nhân viên giao hàng (COD) khi nhận hàng."
        }
