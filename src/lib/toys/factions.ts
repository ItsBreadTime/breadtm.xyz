export interface FactionTheme {
    name: string;
    order: number;
    accent: string;
    accentInk: string;
    chromeAccent: string;
    chromeAccentInk: string;
    surface: string;
    panel: string;
    panelInk: string;
    shadow: string;
    field: string;
    fieldDeep: string;
    gridLine: string;
    washA: string;
    washB: string;
    washC: string;
}

const mixedTheme: FactionTheme = {
    name: 'Mixed',
    order: -1,
    accent: '#ff4f9a',
    accentInk: '#210016',
    chromeAccent: '#d58bb0',
    chromeAccentInk: '#24101d',
    surface: '#100711',
    panel: '#42132f',
    panelInk: '#fff2f8',
    shadow: '#702246',
    field: '#090b1f',
    fieldDeep: '#24214c',
    gridLine: '#20255d',
    washA: 'rgba(0, 166, 255, 0.22)',
    washB: 'rgba(255, 79, 154, 0.17)',
    washC: 'rgba(254, 218, 0, 0.15)'
};

const autobotTheme: FactionTheme = {
    name: 'Autobot',
    order: 0,
    accent: '#ff4b4b',
    accentInk: '#2b0202',
    chromeAccent: '#d66a6a',
    chromeAccentInk: '#2b0808',
    surface: '#160508',
    panel: '#64151c',
    panelInk: '#fff0f0',
    shadow: '#821d26',
    field: '#180609',
    fieldDeep: '#3f1a20',
    gridLine: '#3b0f15',
    washA: 'rgba(255, 75, 75, 0.15)',
    washB: 'rgba(255, 128, 64, 0.075)',
    washC: 'rgba(255, 255, 255, 0.035)'
};

const decepticonTheme: FactionTheme = {
    name: 'Decepticon',
    order: 1,
    accent: '#b891ff',
    accentInk: '#170729',
    chromeAccent: '#9b87c5',
    chromeAccentInk: '#1a1028',
    surface: '#100719',
    panel: '#3b2454',
    panelInk: '#f6edff',
    shadow: '#4d2b72',
    field: '#100719',
    fieldDeep: '#302641',
    gridLine: '#2b1742',
    washA: 'rgba(184, 145, 255, 0.16)',
    washB: 'rgba(111, 77, 161, 0.095)',
    washC: 'rgba(255, 79, 154, 0.045)'
};

const ikeatronTheme: FactionTheme = {
    name: 'IKEAtron',
    order: 2,
    accent: '#feda00',
    accentInk: '#05285a',
    chromeAccent: '#f2d66b',
    chromeAccentInk: '#0d2b4c',
    surface: '#07172e',
    panel: '#063d74',
    panelInk: '#fff4a8',
    shadow: '#0058ab',
    field: '#06101f',
    fieldDeep: '#173654',
    gridLine: '#0b2b4d',
    washA: 'rgba(0, 88, 171, 0.17)',
    washB: 'rgba(254, 218, 0, 0.075)',
    washC: 'rgba(0, 255, 191, 0.04)'
};

const factionThemes: Record<string, FactionTheme> = {
    Autobot: autobotTheme,
    Decepticon: decepticonTheme,
    IKEAtron: ikeatronTheme,
    Maximal: {
        ...autobotTheme,
        name: 'Maximal',
        order: 3
    },
    Predacon: {
        ...decepticonTheme,
        name: 'Predacon',
        order: 4
    }
};

export function getFactionTheme(faction?: string): FactionTheme {
    if (!faction || faction === 'Mixed') return mixedTheme;

    return factionThemes[faction] ?? {
        name: faction,
        order: Number.POSITIVE_INFINITY,
        accent: '#72d8f4',
        accentInk: '#031f28',
        chromeAccent: '#78aebc',
        chromeAccentInk: '#08242c',
        surface: '#07151b',
        panel: '#173d49',
        panelInk: '#eaffff',
        shadow: '#245d6d',
        field: '#07151b',
        fieldDeep: '#173d49',
        gridLine: '#12414f',
        washA: 'rgba(114, 216, 244, 0.14)',
        washB: 'rgba(255, 79, 154, 0.055)',
        washC: 'rgba(255, 255, 255, 0.03)'
    };
}

export function compareFactions(a: string, b: string): number {
    const orderA = getFactionTheme(a).order;
    const orderB = getFactionTheme(b).order;

    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
}
