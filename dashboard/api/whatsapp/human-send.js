import { createSupabaseAdmin, json, resolveTenantId } from '../_lib/whatsapp-server-auth.js';

function cleanString(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

export default async function handler(req, res) {
    if (!['POST'].includes(req.method || '')) {
        res.setHeader('Allow', 'POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use POST for this endpoint',
        });
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch {
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_HUMAN_SEND_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req, 'WHATSAPP_HUMAN_SEND_UNAUTHORIZED');
    if (!tenant.ok) {
        return json(res, tenant.status, tenant);
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const conversationId = cleanString(body.conversation_id);
    const contentText = cleanString(body.content_text);

    if (!conversationId || !contentText) {
        return json(res, 400, {
            ok: false,
            error_code: 'WHATSAPP_HUMAN_SEND_INVALID_PAYLOAD',
            error_message: 'Missing conversation_id or content_text',
        });
    }

    try {
        const { data: conversation, error: conversationError } = await supabase
            .from('tenant_conversations')
            .select('id, tenant_id, channel, customer_phone_normalized, external_contact_id, status')
            .eq('id', conversationId)
            .eq('tenant_id', tenant.tenant_id)
            .eq('channel', 'whatsapp')
            .maybeSingle();

        if (conversationError) throw conversationError;
        if (!conversation?.id) {
            return json(res, 404, {
                ok: false,
                error_code: 'WHATSAPP_HUMAN_SEND_CONVERSATION_NOT_FOUND',
                error_message: 'Conversation not found',
            });
        }

        const recipientPhone = cleanString(conversation.customer_phone_normalized) || cleanString(conversation.external_contact_id);
        if (!recipientPhone) {
            return json(res, 400, {
                ok: false,
                error_code: 'WHATSAPP_HUMAN_SEND_MISSING_RECIPIENT',
                error_message: 'Missing customer phone for this conversation',
            });
        }

        await supabase
            .from('tenant_conversations')
            .update({
                status: 'human_handoff',
                updated_at: new Date().toISOString(),
            })
            .eq('id', conversation.id)
            .eq('tenant_id', tenant.tenant_id)
            .eq('channel', 'whatsapp');

        const insertBody = {
            conversation_id: conversation.id,
            tenant_id: tenant.tenant_id,
            channel: 'whatsapp',
            direction: 'outbound',
            sender_role: 'human',
            message_type: 'text',
            content_text: contentText,
            processing_status: 'done',
            provider_payload_json: {
                recipient_phone: recipientPhone,
                source: 'dashboard_human_handoff',
                auto_handoff: true,
            },
        };

        const { data: messageRows, error: insertError } = await supabase
            .from('conversation_messages')
            .insert(insertBody)
            .select('id, conversation_id, tenant_id, channel, direction, sender_role, message_type, content_text, external_message_id, delivery_status, processing_status, error_message, provider_payload_json, created_at, sent_at, delivered_at, read_at, failed_at');

        if (insertError) throw insertError;

        return json(res, 200, {
            ok: true,
            tenant_id: tenant.tenant_id,
            conversation_id: conversation.id,
            conversation_status: 'human_handoff',
            message: Array.isArray(messageRows) && messageRows.length > 0 ? messageRows[0] : null,
        });
    } catch (error) {
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_HUMAN_SEND_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
