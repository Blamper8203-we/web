import { Page, View, Text, Image } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfStyles as styles } from "../pdfPages/pdfStyles";
import i18next from "i18next";
const t = i18next.t.bind(i18next);

export interface PdfPageProps {
  children: ReactNode;
  orientation?: "portrait" | "landscape";
  variant?: "standard" | "title" | "preview";
  id?: string;
}

export function PdfPage({ children, orientation = "portrait", variant = "standard", id }: PdfPageProps) {
  let pageStyle: any = styles.page;
  if (variant === "title") pageStyle = styles.titlePage;
  if (orientation === "landscape") pageStyle = styles.landscapePage;
  if (variant === "preview" && orientation === "landscape") pageStyle = [styles.landscapePage, styles.previewA4Page] as any;
  if (variant === "preview" && orientation === "portrait") pageStyle = [styles.page, styles.previewA4Page] as any;

  return (
    <Page id={id} size="A4" orientation={orientation} style={pageStyle}>
      <View style={styles.pageTopBar} fixed />
      {children}
    </Page>
  );
}

export interface PdfHeaderProps {
  logoDataUrl?: string | null;
  eyebrow?: string | ReactNode;
  title?: string | ReactNode;
  subtitle?: string | ReactNode;
  brandText?: string;
  brandSubText?: string;
  rightLineText?: string | ReactNode;
  rightSubText?: string | ReactNode;
  // Generic right side content
  rightContent?: ReactNode;
}

export function PdfHeader({
  logoDataUrl,
  eyebrow,
  title,
  subtitle,
  brandText,
  brandSubText,
  rightLineText,
  rightSubText,
  rightContent,
}: PdfHeaderProps) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderLeft}>
        {logoDataUrl ? (
          <View style={[styles.logoBox, { marginRight: 14 }]}>
            <Image src={logoDataUrl} style={styles.logoImage} />
          </View>
        ) : null}
        <View>
          {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          {title && <Text style={styles.pageTitle}>{title}</Text>}
          {subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
          
          {(brandText !== undefined || (!title && !eyebrow)) && (
            <Text style={styles.pageBrand}>{brandText || t("pdf.titlePage.brand", "DINBOARD · Dokumentacja odbiorcza")}</Text>
          )}
          {(brandSubText !== undefined || (!title && !eyebrow)) && (
            <Text style={styles.pageBrandSub}>{brandSubText || t("pdf.titlePage.brandSub", "PN-HD 60364-6 · Arkusz 6")}</Text>
          )}
        </View>
      </View>
      <View style={styles.pageHeaderRight}>
        {rightLineText && (
          <Text style={styles.pageHeaderRightLine}>{rightLineText}</Text>
        )}
        {rightSubText && (
          <Text style={[styles.pageHeaderRightLine, { marginTop: 4, fontSize: 8 }]}>{rightSubText}</Text>
        )}
        {rightContent}
      </View>
    </View>
  );
}

export interface PdfFooterProps {
  leftText?: string;
}

export function PdfFooter({ leftText }: PdfFooterProps) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.pageFooterText}>
        {leftText || t("pdf.footer.normLabel", "PN-HD 60364 · DINBOARD")}
      </Text>
      <Text
        style={styles.pageFooterText}
        render={({ pageNumber, totalPages }) =>
          t("pdf.footer.pageInfo", {
            pageNumber,
            totalPages,
            defaultValue: `${pageNumber} / ${totalPages}`,
          })
        }
      />
    </View>
  );
}
