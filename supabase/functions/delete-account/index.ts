// Supabase Edge Function (Deno) — Exclusão definitiva de conta LGPD
// Faz o deploy manualmente via: supabase functions deploy delete-account
// Nunca expor SUPABASE_SERVICE_ROLE_KEY no aplicativo cliente.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const USER_TABLES = [
  'vacinas',
  'checklist_cuidados',
  'historico_imc',
  'historico_dor',
  'treinos',
  'avaliacoes_psicologia',
  'humor_historico',
  'sinais_vitais',
  'medicamentos',
  'lembretes',
] as const;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente do Supabase não configuradas no servidor.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token de autenticação ausente.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Valida o JWT do próprio usuário usando a chave pública + Authorization header
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Usa service_role apenas no servidor para remover todos os dados e auth.users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    for (const table of USER_TABLES) {
      const { error } = await supabaseAdmin.from(table).delete().eq('user_id', user.id);
      if (error) {
        throw new Error(`Falha ao excluir dados de ${table}: ${error.message}`);
      }
    }

    const { error: perfilError } = await supabaseAdmin.from('perfis').delete().eq('id', user.id);
    if (perfilError) {
      throw new Error(`Falha ao excluir perfil: ${perfilError.message}`);
    }

    // Remove arquivos do usuário no bucket avatars (se existirem)
    const { data: avatarFiles } = await supabaseAdmin.storage.from('avatars').list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${user.id}/${f.name}`);
      await supabaseAdmin.storage.from('avatars').remove(paths);
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      throw new Error(`Falha ao remover usuário em auth.users: ${deleteUserError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno ao excluir conta.';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
