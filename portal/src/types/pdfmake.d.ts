// Déclarations de types minimales pour pdfmake 0.3.x
// pdfmake ne fournit pas de types et @types/pdfmake n'existe pas.

declare module 'pdfmake/build/pdfmake' {
    import type { TDocumentDefinitions } from 'pdfmake/interfaces';

    interface PdfMakeStatic {
        vfs: Record<string, string>;
        createPdf(docDefinition: TDocumentDefinitions): PdfDocumentObject;
    }

    interface PdfDocumentObject {
        download(filename?: string, cb?: () => void): void;
        open(): void;
        print(): void;
        getBlob(cb: (blob: Blob) => void): void;
    }

    const pdfMake: PdfMakeStatic;
    export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
    const vfsFonts: Record<string, string>;
    export default vfsFonts;
}

declare module 'pdfmake/interfaces' {
    export type Alignment = 'left' | 'right' | 'center' | 'justify';
    export type PageOrientation = 'portrait' | 'landscape';
    export type PageSize =
        | 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
        | 'B4' | 'B5'
        | 'LETTER' | 'LEGAL' | 'TABLOID';

    export type Margins = number | [number, number] | [number, number, number, number];

    export interface StyleDictionary {
        [styleName: string]: Style;
    }

    export interface Style {
        fontSize?: number;
        bold?: boolean;
        italics?: boolean;
        color?: string;
        fillColor?: string;
        margin?: Margins;
        alignment?: Alignment;
        lineHeight?: number;
        noWrap?: boolean;
    }

    export type TableCell =
        | string
        | number
        | {
              text?: string | number;
              bold?: boolean;
              italics?: boolean;
              fontSize?: number;
              color?: string;
              fillColor?: string;
              alignment?: Alignment;
              margin?: Margins;
              style?: string | string[];
              noWrap?: boolean;
              colSpan?: number;
              rowSpan?: number;
          };

    export type Content =
        | string
        | ContentText
        | ContentTable
        | Content[];

    export interface ContentText {
        text?: string | Content | Content[];
        style?: string | string[];
        fontSize?: number;
        bold?: boolean;
        italics?: boolean;
        color?: string;
        alignment?: Alignment;
        margin?: Margins;
    }

    export interface ContentTable {
        table: {
            widths?: (number | string)[];
            body: TableCell[][];
            headerRows?: number;
        };
        layout?: string | TableLayout;
        style?: string | string[];
        margin?: Margins;
    }

    export interface TableLayout {
        hLineWidth?: (i: number, node: unknown) => number;
        vLineWidth?: (i: number, node: unknown) => number;
        hLineColor?: (i: number, node: unknown) => string;
        vLineColor?: (i: number, node: unknown) => string;
        paddingLeft?: (i: number, node: unknown) => number;
        paddingRight?: (i: number, node: unknown) => number;
        paddingTop?: (i: number, node: unknown) => number;
        paddingBottom?: (i: number, node: unknown) => number;
        fillColor?: (rowIndex: number, node: unknown, columnIndex: number) => string | null;
    }

    export type FooterFunction = (currentPage: number, pageCount: number) => Content;

    export interface TDocumentDefinitions {
        content: Content | Content[];
        styles?: StyleDictionary;
        pageSize?: PageSize | { width: number; height: number };
        pageOrientation?: PageOrientation;
        pageMargins?: Margins;
        header?: Content | ((currentPage: number, pageCount: number) => Content);
        footer?: Content | FooterFunction;
        defaultStyle?: Style;
        info?: {
            title?: string;
            author?: string;
            subject?: string;
        };
    }
}
