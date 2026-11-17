import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  AvaliacaoPsicologica,
  HumorRegistro,
  Medicamento,
  PerfilUsuario,
  PesoImcRegistro,
  RegistroDor,
  SinalVital,
} from '../types';
import { calcularEClassificarImc } from './clinicaHelpers';

export interface DadosProntuario {
  perfil: PerfilUsuario | null;
  medicamentos: Medicamento[];
  sinaisVitais: SinalVital[];
  humorHistorico: HumorRegistro[];
  avaliacoesPsicologia: AvaliacaoPsicologica[];
  historicoDor: RegistroDor[];
  historicoImc?: PesoImcRegistro[];
  geradoEm?: Date;
}

const MOOD_LABELS: Record<string, string> = {
  feliz: 'Feliz',
  triste: 'Triste',
  nervoso: 'Nervoso / Irritado',
  ansioso: 'Ansioso',
};

const escapeHtml = (valor?: string | number | null): string => {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const formatarDataHora = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return escapeHtml(iso);
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export function gerarHtmlProntuario(dados: DadosProntuario): string {
  const {
    perfil,
    medicamentos,
    sinaisVitais,
    humorHistorico,
    avaliacoesPsicologia,
    historicoDor,
    geradoEm = new Date(),
  } = dados;

  const nomePaciente = perfil?.nome?.trim() || 'Paciente (Acesso Local)';
  const alergiasTexto = perfil?.alergias?.trim();
  const comorbidades = (perfil?.comorbidades || []).filter((c) => c && c !== 'Nenhuma');

  const imcRes =
    perfil?.peso && perfil?.altura
      ? calcularEClassificarImc(perfil.peso, perfil.altura)
      : perfil?.imc
        ? { imcArredondado: perfil.imc, classificacao: 'Registrado' }
        : null;

  const blocoAlergias = alergiasTexto
    ? `<div class="alerta-alergia">
         <strong>ATENÇÃO — ALERGIAS REGISTRADAS:</strong>
         <span>${escapeHtml(alergiasTexto)}</span>
       </div>`
    : `<div class="info-neutra">
         <strong>Alergias registradas:</strong> Nenhuma alergia informada pelo paciente.
       </div>`;

  const medsAtivos = medicamentos.filter((m) => !m.descontinuado);
  const medsDescontinuados = medicamentos.filter((m) => m.descontinuado);

  const linhasMeds = [...medsAtivos, ...medsDescontinuados]
    .map((m) => {
      const status = m.descontinuado ? 'Descontinuado' : 'Em uso';
      return `
        <tr>
          <td>${escapeHtml(m.nome)}</td>
          <td>${escapeHtml(m.dosagem)} (${escapeHtml(m.forma)})</td>
          <td>${escapeHtml(m.estoque)}</td>
          <td>${escapeHtml(m.validade || '—')}</td>
          <td>${escapeHtml(m.prescritor || '—')}</td>
          <td>${status}</td>
        </tr>
      `;
    })
    .join('');

  const tabelaMedicamentos =
    medicamentos.length === 0
      ? '<p class="vazio">Nenhum medicamento cadastrado até o momento.</p>'
      : `<table>
           <thead>
             <tr>
               <th>Medicamento</th>
               <th>Dosagem / Forma</th>
               <th>Qtd</th>
               <th>Validade</th>
               <th>Prescritor</th>
               <th>Situação</th>
             </tr>
           </thead>
           <tbody>${linhasMeds}</tbody>
         </table>`;

  const ultimosSinais = sinaisVitais
    .slice()
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 6);

  const linhasSinais = ultimosSinais
    .map((s) => {
      const pa = s.pressao?.trim() ? `${escapeHtml(s.pressao)} mmHg` : '—';
      const glic = s.glicose?.trim()
        ? `${escapeHtml(s.glicose)} mg/dL${s.glicoseTipo ? ` (${escapeHtml(s.glicoseTipo)})` : ''}`
        : '—';
      return `
        <tr>
          <td>${formatarDataHora(s.data)}</td>
          <td>${pa}</td>
          <td>${s.bpm?.trim() ? `${escapeHtml(s.bpm)} bpm` : '—'}</td>
          <td>${glic}</td>
          <td>${s.oxigenacao?.trim() ? `${escapeHtml(s.oxigenacao)}%` : '—'}</td>
          <td>${s.temperatura?.trim() ? `${escapeHtml(s.temperatura)} °C` : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const tabelaSinais =
    ultimosSinais.length === 0
      ? '<p class="vazio">Nenhum sinal vital registrado até o momento.</p>'
      : `<table>
           <thead>
             <tr>
               <th>Data / Hora</th>
               <th>Pressão Arterial</th>
               <th>FC</th>
               <th>Glicemia</th>
               <th>SpO₂</th>
               <th>Temperatura</th>
             </tr>
           </thead>
           <tbody>${linhasSinais}</tbody>
         </table>`;

  const ultimasDores = historicoDor
    .slice()
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  const listaDores =
    ultimasDores.length === 0
      ? '<p class="vazio">Nenhum registro de dor (EVA) informado.</p>'
      : `<ul>${ultimasDores
          .map(
            (d) =>
              `<li><strong>${formatarDataHora(d.data)}:</strong> Dor nível ${escapeHtml(d.nivel)}/10${
                d.regiao ? ` — Região: ${escapeHtml(d.regiao)}` : ''
              }${d.tipo ? ` · Característica: ${escapeHtml(d.tipo)}` : ''}</li>`
          )
          .join('')}</ul>`;

  const ultimaPhq9 = avaliacoesPsicologia
    .filter((a) => a.tipo === 'PHQ-9')
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

  const ultimaGad7 = avaliacoesPsicologia
    .filter((a) => a.tipo === 'GAD-7')
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())[0];

  const ultimosHumores = humorHistorico
    .slice()
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 4);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1E293B; padding: 24px; line-height: 1.45; }
          .header { border-bottom: 2px solid #0B6E99; padding-bottom: 12px; margin-bottom: 18px; }
          .header h1 { color: #0B6E99; margin: 0 0 4px 0; font-size: 20px; }
          .sub { color: #475569; font-size: 12px; margin: 0; }
          .alerta-alergia { background: #FEE2E2; border: 2px solid #DC2626; color: #7F1D1D; padding: 12px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
          .info-neutra { background: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 12px; }
          .secao { margin-top: 18px; }
          .secao h2 { font-size: 15px; color: #0B6E99; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 10px; }
          .grid { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; }
          .badge { background: #E0F2FE; color: #075985; padding: 4px 8px; border-radius: 6px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 6px; }
          th { background: #0B6E99; color: #FFFFFF; padding: 8px; text-align: left; }
          td { border: 1px solid #CBD5E1; padding: 7px 8px; }
          tr:nth-child(even) td { background: #F8FAFC; }
          ul { margin: 6px 0; padding-left: 18px; font-size: 13px; }
          li { margin-bottom: 4px; }
          .vazio { color: #64748B; font-style: italic; font-size: 12px; }
          .rodape { margin-top: 24px; border-top: 1px solid #CBD5E1; padding-top: 10px; font-size: 11px; color: #64748B; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Resumo Clínico Pessoal (Prontuário de Acompanhamento)</h1>
          <p class="sub">
            Gerado em ${geradoEm.toLocaleDateString('pt-BR')} às ${geradoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            · Aplicativo Meu App de Saúde (Curricularização da Extensão — UNC)
          </p>
        </div>

        ${blocoAlergias}

        <div class="secao">
          <h2>1. Dados do Paciente</h2>
          <div class="grid">
            <div><strong>Nome:</strong> ${escapeHtml(nomePaciente)}</div>
            <div><strong>Idade:</strong> ${perfil?.idade ? `${escapeHtml(perfil.idade)} anos` : '—'}</div>
            <div><strong>Sexo:</strong> ${escapeHtml(perfil?.sexo || '—')}</div>
            <div><strong>Peso / Altura:</strong> ${perfil?.peso ? `${escapeHtml(perfil.peso)} kg` : '—'} / ${perfil?.altura ? `${escapeHtml(perfil.altura)} m` : '—'}</div>
            <div><strong>IMC:</strong> ${imcRes ? `${imcRes.imcArredondado.toFixed(1)} (${escapeHtml(imcRes.classificacao)})` : '—'}</div>
          </div>
          <p style="font-size: 13px; margin-top: 8px;">
            <strong>Comorbidades / Condições pré-existentes:</strong>
            ${comorbidades.length > 0 ? comorbidades.map((c) => `<span class="badge">${escapeHtml(c)}</span>`).join(' ') : 'Nenhuma informada.'}
          </p>
        </div>

        <div class="secao">
          <h2>2. Medicamentos Registrados (${medsAtivos.length} ativos)</h2>
          ${tabelaMedicamentos}
        </div>

        <div class="secao">
          <h2>3. Últimos Sinais Vitais</h2>
          ${tabelaSinais}
        </div>

        <div class="secao">
          <h2>4. Registro de Dor (Fisioterapia — EVA 0 a 10)</h2>
          ${listaDores}
        </div>

        <div class="secao">
          <h2>5. Saúde Emocional e Rastreios (Psicologia)</h2>
          <ul>
            <li><strong>PHQ-9 (Humor/Depressão):</strong> ${
              ultimaPhq9
                ? `${ultimaPhq9.pontuacao}/${ultimaPhq9.maxPontuacao} pts — ${escapeHtml(ultimaPhq9.classificacao)} (${formatarDataHora(ultimaPhq9.data)})`
                : 'Nenhuma avaliação realizada.'
            }</li>
            <li><strong>GAD-7 (Ansiedade):</strong> ${
              ultimaGad7
                ? `${ultimaGad7.pontuacao}/${ultimaGad7.maxPontuacao} pts — ${escapeHtml(ultimaGad7.classificacao)} (${formatarDataHora(ultimaGad7.data)})`
                : 'Nenhuma avaliação realizada.'
            }</li>
          </ul>
          ${
            ultimosHumores.length > 0
              ? `<p style="font-size: 12px; color: #334155;"><strong>Últimos registros diários de humor:</strong> ${ultimosHumores
                  .map((h) => `${escapeHtml(MOOD_LABELS[h.moodId] || h.moodId)} (${new Date(h.data).toLocaleDateString('pt-BR')})`)
                  .join(' · ')}</p>`
              : ''
          }
        </div>

        <div class="rodape">
          Documento gerado pelo paciente para apoio ao acompanhamento em saúde. Não substitui prontuário oficial médico ou avaliação presencial nas Clínicas-Escola da UNC.
        </div>
      </body>
    </html>
  `;
}

export async function exportarProntuarioPdf(dados: DadosProntuario): Promise<void> {
  const html = gerarHtmlProntuario(dados);
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (isSharingAvailable) {
    await Sharing.shareAsync(uri);
  } else {
    await Print.printAsync({ html });
  }
}
