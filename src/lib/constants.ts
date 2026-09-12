// Configurações globais da caixa d'água / reservatório
export const ALTURA_CAIXA_CM = 75; // Altura total da caixa d'água em cm (150 cm = caixa vazia / 0%)
export const CAPACIDADE_TOTAL_L = 1000; // Capacidade máxima em litros
export const LIMIAR_NIVEL_CRITICO_PERCENT = 0.1; // Limiar de nível crítico (10% de capacidade restante)
export const INTERVALO_MEDICAO_MIN = 5; // Intervalo entre medições em minutos
export const OFFSET_DISTANCIA_CM = 7; // Offset da distância medida pelo sensor em cm (distância do sensor até a superfície da água quando a caixa está cheia)

export interface MedidasCaixa {
    distanciaEfetivaCm: number;
    distanciaEfetivaFormatada: string; // Ex: "22" ou "22.5" (sem .0 quando inteiro)
    alturaAguaCm: number;
    alturaAguaFormatada: string;
    porcentagem: number;
    volumeL: number;
    isVazio: boolean;
    isNivelCritico: boolean;
    hasAlert: boolean;
}

// Formata números sem casas decimais desnecessárias (ex: 22.0 -> 22, 22.5 -> 22.5)
export function formatarNumero(n: number): string {
    const rounded = Math.round(n * 10) / 10;
    return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toString();
}

// Função centralizada: fonte única de cálculo para todas as medições derivadas do sensor
export function calcularMedidas(waterDistanceRaw?: number | null): MedidasCaixa {
    if (waterDistanceRaw == null || typeof waterDistanceRaw !== 'number') {
        return {
            distanciaEfetivaCm: ALTURA_CAIXA_CM,
            distanciaEfetivaFormatada: "--",
            alturaAguaCm: 0,
            alturaAguaFormatada: "0",
            porcentagem: 0,
            volumeL: 0,
            isVazio: false,
            isNivelCritico: false,
            hasAlert: false,
        };
    }

    // Distância efetiva = leitura bruta menos o offset do sensor na tampa
    const rawDist = Math.max(0, waterDistanceRaw - OFFSET_DISTANCIA_CM);
    const distanciaEfetivaCm = Math.min(ALTURA_CAIXA_CM, rawDist);
    const alturaAguaCm = Math.max(0, ALTURA_CAIXA_CM - distanciaEfetivaCm);
    const porcentagem = Math.round((alturaAguaCm / ALTURA_CAIXA_CM) * 100);
    const volumeL = Math.round((porcentagem / 100) * CAPACIDADE_TOTAL_L);

    const isVazio = waterDistanceRaw >= (ALTURA_CAIXA_CM + OFFSET_DISTANCIA_CM);
    const isNivelCritico = waterDistanceRaw >= (OFFSET_DISTANCIA_CM + ALTURA_CAIXA_CM * (1 - LIMIAR_NIVEL_CRITICO_PERCENT));
    const hasAlert = isVazio || isNivelCritico;

    return {
        distanciaEfetivaCm,
        distanciaEfetivaFormatada: formatarNumero(distanciaEfetivaCm),
        alturaAguaCm,
        alturaAguaFormatada: formatarNumero(alturaAguaCm),
        porcentagem,
        volumeL,
        isVazio,
        isNivelCritico,
        hasAlert,
    };
}