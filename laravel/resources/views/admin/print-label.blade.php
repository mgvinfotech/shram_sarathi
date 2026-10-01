<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Shipping Label - {{ $provider->name }}</title>
    <style>
        @media print { body { margin: 0; } .no-print { display: none; } }
        body { font-family: Arial, sans-serif; padding: 20px; }
        .label { border: 3px solid #000; padding: 20px; width: 400px; }
        .company { font-size: 18px; font-weight: bold; text-align: center;
                    border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .to { font-size: 14px; margin-bottom: 5px; }
        .name { font-size: 20px; font-weight: bold; margin: 10px 0; }
        .address { font-size: 14px; line-height: 1.6; }
        .pincode { font-size: 24px; font-weight: bold; letter-spacing: 4px; margin-top: 10px; }
        .gift { background: #f0f0f0; padding: 8px; margin-top: 10px;
                 font-size: 12px; border-radius: 4px; }
        .print-btn { margin-top: 20px; padding: 10px 20px; font-size: 16px;
                      cursor: pointer; background: #007bff; color: white;
                      border: none; border-radius: 4px; }
        .back-btn { margin-top: 10px; padding: 8px 16px; font-size: 14px;
                     cursor: pointer; background: #6c757d; color: white;
                     border: none; border-radius: 4px; text-decoration: none; display: inline-block; }
    </style>
</head>
<body>
    <div class="label">
        <div class="company">🇮🇳 श्रम सारथी</div>
        <div class="to">TO:</div>
        <div class="name">{{ $provider->name }}</div>
        <div class="to">📱 {{ $provider->phone }}</div>
        <div class="address">{{ $address }}</div>
        @if($pincode)
            <div class="pincode">PIN: {{ $pincode }}</div>
        @endif
        <div class="gift">🎁 Gift: {{ $reward->gift_name }}</div>
    </div>

    <div class="no-print" style="margin-top: 20px;">
        <button class="print-btn" onclick="window.print()">🖨️ Print Label</button>
        <a href="{{ route('admin.rewards') }}" class="back-btn">← Back to Rewards</a>
    </div>
</body>
</html>
