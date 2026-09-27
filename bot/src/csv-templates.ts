export type CsvTemplate = { fileName: string; content: string };

export const csvTemplates = {
    houses: {
        fileName: "houses_template.csv",
        content: "address;number\nул. Ленина, 25;1\n",
    },
    dispatchers: {
        fileName: "dispatchers_template.csv",
        content: "full_name;phone\nИванов Иван Иванович;+79991234567\n",
    },
    residents: {
        fileName: "residents_template.csv",
        content: "full_name;phone;apartment;entrance_number\nПетров Пётр Петрович;+79997654321;12;2\n",
    },
} satisfies Record<string, CsvTemplate>;
