## HTTPS certificate

Generate a self-signed certificate:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365
```

The command creates `key.pem` and `cert.pem` in the current directory.

## TLS Debug Session

<!-- $ openssl s_client -connect localhost:3443 -->

```text
chert@anton-che-msi MINGW64 ~
$ openssl s_client -connect localhost:3443
Connecting to ::1
CONNECTED(00000200)
Can't use SSL_get_servername
depth=0 C=UK, ST=Some-State, O=Internet Widgits Pty Ltd
verify error:num=18:self-signed certificate
verify return:1
depth=0 C=UK, ST=Some-State, O=Internet Widgits Pty Ltd
verify return:1

---

Certificate chain
0 s:C=UK, ST=Some-State, O=Internet Widgits Pty Ltd
i:C=UK, ST=Some-State, O=Internet Widgits Pty Ltd
a:PKEY: RSA, 2048 (bit); sigalg: sha256WithRSAEncryption
v:NotBefore: Aug 8 13:15:40 2026 GMT; NotAfter: Aug 8 13:15:40 2027 GMT

---

Server certificate
-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUPwjuD/1vrEn3nick/V1H203bM80wDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCVUsxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yNjA4MDgxMzE1NDBaFw0yNzA4
MDgxMzE1NDBaMEUxCzAJBgNVBAYTAlVLMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCqqE4TpRrtYuqCg6pdO9wVqyAXlZEIU7bXdAPa4pyO
m0RP3UK4gr/50yl3RyLLuS43A4pVZVmXqTldzRFBo1xv4oTqpsuYXHPPp7fm/FJf
1vVBJ/loor0GuEyxt1p6lz8sJczsywBg7MbplZUMwJatSC/IMnLVn4awT0kcq1w5
OGCLxyeasonKed7bZc8yUbbYg9AldvEOhMxOW9j3sCTjXeF3U6RrY/UYalnwmpld
Me74pUonHYanf0W+5clTtgkVxNjTm7YJZGkGyfCIK3iOgqoASvwcUXnyLe4BVbUM
UV1iPo+3R07JVaZWNB9a2rTCDVq690xRb4J16L434zmFAgMBAAGjUzBRMB0GA1Ud
DgQWBBSLXQxDxhTgmYJnOXYjAw4Vlg6eHDAfBgNVHSMEGDAWgBSLXQxDxhTgmYJn
OXYjAw4Vlg6eHDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAp
cLV40sPkmIITy3c9oDcQkpfbUErWqAzu7Zib9oalEmJ1/H0PuyXIQENrpblQvhDm
3ywgXlS68eyeFXhZX7+HKzzbbfdaCUy66Pc3zM3dOwcCWzZXGAZf3bZ7Enc3thE2
uc59WQKbxhf1SFqetiboK97fHEZ/PwvslIUw24iSq+9TK8lzZVko4pBCkpYCV7ag
cS6tNHvqKWU2awY3Ldm4Nj6aMuLO1uwmEb8X7b+e/4a4sqxewgKndCqj/dmGalCT
SCU7J5QajkXbtP/CEvNWw2ih7fMPiJldqwR52Drz++hubUEdgbDk5DeUe6ikTfTC
4ErUTP0WfOv9OcmgAwWw
-----END CERTIFICATE-----
subject=C=UK, ST=Some-State, O=Internet Widgits Pty Ltd
issuer=C=UK, ST=Some-State, O=Internet Widgits Pty Ltd

---

No client certificate CA names sent
Peer signing digest: SHA256
Peer signature type: rsa_pss_rsae_sha256
Negotiated TLS1.3 group: X25519MLKEM768

---

SSL handshake has read 2523 bytes and written 1611 bytes
Verification error: self-signed certificate

---

New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Protocol: TLSv1.3
Server public key is 2048 bit
This TLS version forbids renegotiation.
Compression: NONE
Expansion: NONE
No ALPN negotiated
Early data was not sent
Verify return code: 18 (self-signed certificate)

---

---

Post-Handshake New Session Ticket arrived:
SSL-Session:
Protocol : TLSv1.3
Cipher : TLS*AES_256_GCM_SHA384
Session-ID: 741ECDC8BDB5449EF3BE706F9694572624A2C5230FB76FE9AEB9F8BAFE3B243F
Session-ID-ctx:
Resumption PSK: 79EE6CF62B22C99DED2CC63F10CFA2D3C1B7C55BEE6A65F3FC8F87472F7F2328D79F5FAE8A0251A5067B52418FB37C34
PSK identity: None
PSK identity hint: None
SRP username: None
TLS session ticket lifetime hint: 7200 (seconds)
TLS session ticket:
0000 - ec b6 9c 75 81 3a 03 10-56 18 89 9e 9c 85 a3 e8 ...u.:..V.......
0010 - 82 0f 8a 32 fd 83 c5 bf-9e e0 e9 6d 72 a9 4b 09 ...2.......mr.K.
0020 - a2 5c 69 ad b2 f5 b8 7e-3f e3 ce e4 b3 5d 8e 1b .\i....~?....]..
0030 - 76 0a 21 ac e9 c4 ee 6c-48 39 c8 6e f9 32 56 25 v.!....lH9.n.2V%
0040 - 1e 48 7b 28 d1 82 2a ed-87 e9 78 f9 a0 c2 1f f4 .H{(..*...x.....
0050 - 20 23 26 64 36 be 8e ad-70 66 53 6f 19 0e 8d f2 #&d6...pfSo....
0060 - 8a c7 56 62 f8 e0 24 4d-7d fb 46 3e 47 7f ec 34 ..Vb..$M}.F>G..4
0070 - 2a 72 63 b2 83 8c f0 13-b9 ff 23 a3 52 61 84 72 *rc.......#.Ra.r
0080 - a4 f6 9f eb 39 09 d2 5f-3f 10 ef 48 b7 43 ab ed ....9..*?..H.C..
0090 - 17 cc 67 77 82 d7 44 22-5d bd 25 ba 2c 9e 74 11 ..gw..D"].%.,.t.
00a0 - 2c 43 55 f0 fe 1d 43 9e-d5 32 7b a8 d9 8b 6c f4 ,CU...C..2{...l.
00b0 - d0 8f 80 ab 62 37 05 17-85 50 52 36 ce d5 4f f0 ....b7...PR6..O.
00c0 - 3a e8 56 5a 2d bf 59 cd-67 3d cf f7 70 13 a1 8e :.VZ-.Y.g=..p...
00d0 - d5 a3 fb b8 ca 45 53 57-c1 73 df c9 ca 49 f2 89 .....ESW.s...I..
00e0 - 2c 96 84 2b b4 9d cf 2b-5f 5f f4 a8 df 0e 22 78 ,..+...+\_\_...."x

    Start Time: 1786196257
    Timeout   : 7200 (sec)
    Verify return code: 18 (self-signed certificate)
    Extended master secret: no
    Max Early Data: 0

---

## read R BLOCK

Post-Handshake New Session Ticket arrived:
SSL-Session:
Protocol : TLSv1.3
Cipher : TLS*AES_256_GCM_SHA384
Session-ID: F0BABCF2FA58A758709697FB78645A34C273497FA396927D02B9C4C270D4A4F1
Session-ID-ctx:
Resumption PSK: A008C4C05869A6BB797FB234574A86C751CB470C3BF8F257B533971E0254E1285A84ED2624AB7C45A5378DE4A16E98C6
PSK identity: None
PSK identity hint: None
SRP username: None
TLS session ticket lifetime hint: 7200 (seconds)
TLS session ticket:
0000 - ec b6 9c 75 81 3a 03 10-56 18 89 9e 9c 85 a3 e8 ...u.:..V.......
0010 - 34 54 27 ed 47 37 2d 81-7a a0 33 73 ff db e7 ef 4T'.G7-.z.3s....
0020 - 83 00 f4 5c e8 6c ee f4-e2 f9 be 1d b6 6b 96 0f ...\.l.......k..
0030 - 89 77 a0 25 5f 32 3d 9e-c4 fa 93 dc 0f 37 12 5e .w.%\_2=......7.^
0040 - cd e9 69 84 95 5a 7b 08-fb 99 99 45 ec 46 d8 9f ..i..Z{....E.F..
0050 - 5d ec 84 85 bb 7b ee 5e-b5 98 22 ce c3 7e c5 e1 ]....{.^.."..~..
0060 - f6 bb c3 c4 4f cd b0 b0-35 f0 eb 36 0e f4 de 8b ....O...5..6....
0070 - e5 31 67 56 9c 0f 58 7e-ef 12 7a 3e 64 68 04 79 .1gV..X~..z>dh.y
0080 - fc 2c d8 f2 25 d0 5f b7-95 97 45 66 0d e6 cf 18 .,..%.*...Ef....
0090 - 1a 9a 2c 8d d3 90 cd 68-97 2b ba 81 27 24 2d 2b ..,....h.+..'$-+
00a0 - 11 e8 6c 91 2e cf a3 e0-a5 99 82 da 27 a2 36 f4 ..l.........'.6.
00b0 - d0 6d 39 06 8b 67 9c 17-ef d0 06 a4 80 f1 69 62 .m9..g........ib
00c0 - b0 51 bb a5 12 e8 55 44-23 2f 07 56 89 ff ff 63 .Q....UD#/.V...c
00d0 - b5 91 37 67 03 dd 94 05-f2 be 07 73 48 84 51 d9 ..7g.......sH.Q.
00e0 - 7b 19 8c bc 6c c7 9a 5c-08 60 93 01 91 c4 86 0f {...l..\.`......

    Start Time: 1786196257
    Timeout   : 7200 (sec)
    Verify return code: 18 (self-signed certificate)
    Extended master secret: no
    Max Early Data: 0

---

read R BLOCK
GET / HTTP/1.1
Host: localhost

HTTP/1.1 200 OK
content-type: text/plain

Host=localhost, Path=/closed

chert@anton-che-msi MINGW64 ~

```

## Error code 18

Код 18 означає, що сервер використовує самопідписаний сертифікат, якому клієнт не довіряє.
