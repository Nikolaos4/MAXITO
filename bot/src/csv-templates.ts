export type CsvTemplate = { fileName: string; content: string };

export const csvTemplates = {
    houses: {
        fileName: "houses_template.csv",
        content:
            "address;number;entrances_count;floors_count;construction_year;chat_invite_link\nул. Ленина, 25;к2;4;9;1985;https://max.ru/join/example\n",
    },
    dispatchers: {
        fileName: "dispatchers_template.csv",
        content: "full_name;phone\nИванов Иван Иванович;+79991234567\n",
    },
    residents: {
        fileName: "residents_template.csv",
        content: "full_name;phone;apartment;entrance_number\nПетров Пётр Петрович;+79997654321;12;2\n",
    },
    emergencyServices: {
        fileName: "emergency_services_template.csv",
        content: "name;phone\nАварийно-диспетчерская служба;+78001234567\n",
    },
} satisfies Record<string, CsvTemplate>;
