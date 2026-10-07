AS Human $customer
I OPEN Login
I TYPE WhatsAppNumber
I HOPE SEE gateway.receive_whatsapp_number
I HOPE SEE gateway.validate_chat_number
I HOPE SEE gateway.check_whatsapp_exists
I HOPE SEE login.create_magic_link
I HOPE SEE login.send_magic_link
I FOLLOW MagicLink
I PRESENT PasskeyCredential
I HOPE SEE login.receive_passkey
I HOPE SEE login.validate_passkey
I HOPE SEE web.receive_passkey_route
I HOPE SEE gateway.return_authenticated_result
