"""
core/mpesa.py — Safaricom Daraja API helper (STK Push)
"""

import base64
import requests
from datetime import datetime
from django.conf import settings


def _get_access_token() -> str:
    url = (
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
        if settings.MPESA_ENV == 'sandbox'
        else 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    )
    resp = requests.get(
        url,
        auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['access_token']


def _get_password_and_timestamp():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    raw       = settings.MPESA_SHORTCODE + settings.MPESA_PASSKEY + timestamp
    password  = base64.b64encode(raw.encode()).decode()
    return password, timestamp


def initiate_stk_push(phone: str, amount: int, account_ref: str, description: str) -> dict:
    """
    Sends an M-Pesa STK Push (Lipa na M-Pesa Online).
    Returns the raw Daraja API response dict.
    """
    try:
        token     = _get_access_token()
        password, timestamp = _get_password_and_timestamp()

        url = (
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
            if settings.MPESA_ENV == 'sandbox'
            else 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
        )

        payload = {
            'BusinessShortCode': settings.MPESA_SHORTCODE,
            'Password'         : password,
            'Timestamp'        : timestamp,
            'TransactionType'  : 'CustomerPayBillOnline',
            'Amount'           : amount,
            'PartyA'           : phone,
            'PartyB'           : settings.MPESA_SHORTCODE,
            'PhoneNumber'      : phone,
            'CallBackURL'      : settings.MPESA_CALLBACK_URL,
            'AccountReference' : account_ref[:12],   # max 12 chars
            'TransactionDesc'  : description[:13],   # max 13 chars
        }

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type' : 'application/json',
        }

        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        return resp.json()

    except Exception as e:
        return {'ResponseCode': '-1', 'errorMessage': str(e)}