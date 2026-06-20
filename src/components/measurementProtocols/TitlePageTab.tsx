import { useRef } from "react";
import type { ProjectMetadata } from "../../types/projectMetadata";
import { DEFAULT_WORK_SCOPE_ITEMS, mergeDefaultAttachmentItems } from "../../lib/projectMetadata";
import { TITLE_WORK_SCOPE_COLUMN_SIZE, TITLE_WORK_SCOPE_MAX_ITEMS } from "../../lib/export/pdfPages/pdfHelpers";
import { chunkRows } from "../../lib/measurementProtocolHelpers";
import { AppIcon } from "../AppIcon";
import { PageFooter } from "./ProtocolShared";

interface TitlePageTabProps {
  metadata: ProjectMetadata;
  onChange: (patch: ProjectMetadata) => void;
  displayDate: string;
  protocolNumber: string;
  stampText: string;
  titlePageIndex: number;
  totalUiPages: number;
}

export function TitlePageTab({
  metadata,
  onChange,
  displayDate,
  protocolNumber,
  stampText,
  titlePageIndex,
  totalUiPages,
}: TitlePageTabProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => reject(new Error("Nie udało się odczytać pliku logo."));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (dataUrl) {
      onChange({
        ...metadata,
        titlePageCompanyLogoFileName: file.name,
        titlePageCompanyLogoDataUrl: dataUrl,
      });
    }
    event.target.value = "";
  };

  const workScopeItems = metadata.titlePageWorkScopeItems.length > 0
    ? metadata.titlePageWorkScopeItems
    : DEFAULT_WORK_SCOPE_ITEMS.map((text) => ({ text, isChecked: true }));
  const titleWorkScopeItems = workScopeItems.slice(0, TITLE_WORK_SCOPE_MAX_ITEMS);
  const titleWorkScopeColumns = chunkRows(titleWorkScopeItems, TITLE_WORK_SCOPE_COLUMN_SIZE);

  const attachmentItems = mergeDefaultAttachmentItems(metadata.titlePageAttachmentItems);
  const titleAttachmentItems = attachmentItems;
  const titleAttachmentColumns = titleAttachmentItems.length > 3
    ? chunkRows(titleAttachmentItems, Math.ceil(titleAttachmentItems.length / 2))
    : [titleAttachmentItems];

  return (
    <div className="a4-page">
      <div>
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 border border-brand rounded-xl flex items-center justify-center bg-white cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden shrink-0 group relative shadow-sm"
              onClick={() => logoInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/bmp"
                className="hidden"
                ref={logoInputRef}
                onChange={handleLogoUpload}
              />
              {metadata.titlePageCompanyLogoDataUrl ? (
                <>
                  <img src={metadata.titlePageCompanyLogoDataUrl} alt="Logo firmy" className="w-full h-full object-contain p-1.5" />
                  <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-[9px] font-bold text-white tracking-widest uppercase text-center leading-tight">
                    Zmień<br/>logo
                  </div>
                </>
              ) : (
                <span className="text-[10px] text-gray-900 font-bold tracking-wide uppercase group-hover:scale-105 transition-transform text-center leading-tight">DODAJ<br/>LOGO</span>
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Dokumentacja Powykonawcza</h1>
              <p className="text-[9px] text-gray-500 font-medium">ZGODNOŚĆ Z NORMĄ PN-HD 60364 (ARKUSZ 6)</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-semibold text-gray-500 uppercase">Protokół nr</div>
            <div className="text-xs font-bold text-white bg-brand px-2.5 py-0.5 rounded mt-0.5 inline-block">{protocolNumber}</div>
            <div className="text-[9px] text-gray-400 mt-1">Data: <span className="font-medium text-gray-700">{displayDate}</span></div>
          </div>
        </div>

        <div className="text-center my-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Oświadczenie Wykonawcy</h2>
          <p className="text-xs text-gray-500 italic mt-0.5">instalacji elektrycznej wykonanej zgodnie z przepisami i normami</p>
        </div>

        <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-4 mb-4">
          <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-3 pb-2 border-b border-gray-100">Informacje o obiekcie</h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-baseline">
              <span className="font-bold text-gray-700 w-24 shrink-0">Rodzaj obiektu:</span>
              <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.titlePageObjectType || ""} placeholder="Budynek jednorodzinny / Lokal mieszkalny" onChange={(e) => onChange({ ...metadata, titlePageObjectType: e.target.value })} />
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-gray-700 w-24 shrink-0">Adres:</span>
              <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.address || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, address: e.target.value })} />
            </div>
            <div className="flex items-baseline">
              <span className="font-bold text-gray-700 w-24 shrink-0">Inwestor:</span>
              <input className="mp-editable flex-grow text-gray-900 font-semibold" value={metadata.investor || ""} placeholder="................................................................" onChange={(e) => onChange({ ...metadata, investor: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-xl flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="bg-brand text-white px-4 py-3 flex items-center gap-2 mb-4 shrink-0">
                <div className="bg-white/20 p-1 rounded flex items-center justify-center">
                  <AppIcon name="list" size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest m-0">Zakres prac</h3>
              </div>
              <div className="px-4 pb-4 flex-grow flex flex-col">
                <div className={titleWorkScopeColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
                {titleWorkScopeColumns.map((columnItems, columnIndex) => (
                  <div key={columnIndex} className="flex flex-col gap-3">
                    {columnItems.map((item, itemIndex) => {
                      const absoluteIndex = columnIndex * TITLE_WORK_SCOPE_COLUMN_SIZE + itemIndex;
                      return (
                        <label key={absoluteIndex} className="flex items-start gap-2 cursor-pointer relative group border-b border-gray-100 pb-2.5">
                          <input 
                            type="checkbox" 
                            style={{ display: "none" }}
                            checked={item.isChecked}
                            onChange={(e) => {
                              const nextItems = [...workScopeItems];
                              nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], isChecked: e.target.checked };
                              onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                            }}
                          />
                          <div className="w-4 h-4 rounded border border-brand flex items-center justify-center bg-transparent shrink-0 mt-0.5">
                            {item.isChecked ? <span className="text-brand text-[10px] font-bold leading-none">✓</span> : null}
                          </div>
                          <span
                            className="mp-editable text-[11px] font-medium text-gray-900 leading-tight flex-1 outline-none break-words min-h-[16px]"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const nextItems = [...workScopeItems];
                              nextItems[absoluteIndex] = { ...nextItems[absoluteIndex], text: e.currentTarget.innerText };
                              onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                            }}
                            dangerouslySetInnerHTML={{ __html: item.text || "..." }}
                          />
                          <button
                            type="button"
                            className="mp-delete-btn shrink-0 mt-0.5"
                            title="Usuń punkt"
                            onClick={(e) => {
                              e.preventDefault();
                              const nextItems = [...workScopeItems];
                              nextItems.splice(absoluteIndex, 1);
                              onChange({ ...metadata, titlePageWorkScopeItems: nextItems });
                            }}
                          >
                            ✕
                          </button>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
              {workScopeItems.length < TITLE_WORK_SCOPE_MAX_ITEMS && (
                <button
                  type="button"
                  className="mt-3 text-[10px] text-brand font-semibold text-left opacity-70 hover:opacity-100 flex items-center gap-1"
                  onClick={() => {
                    onChange({ ...metadata, titlePageWorkScopeItems: [...workScopeItems, { text: "", isChecked: true }] });
                  }}
                >
                  + Dodaj kolejny punkt
                </button>
              )}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl flex flex-col justify-between overflow-hidden">
            <div className="flex flex-col h-full">
              <div className="bg-brand text-white px-4 py-3 flex items-center gap-2 mb-4 shrink-0">
                <div className="bg-white/20 p-1 rounded flex items-center justify-center">
                  <AppIcon name="file" size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-widest m-0">Załączniki do protokołu</h3>
              </div>
              <div className="px-4 pb-4 flex-grow flex flex-col">
                <div className={titleAttachmentColumns.length > 1 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "flex flex-col gap-3"}>
                {titleAttachmentColumns.map((columnItems, columnIndex) => (
                  <div key={columnIndex} className="flex flex-col gap-3">
                    {columnItems.map((item, itemIndex) => (
                      <div key={`${columnIndex}-${itemIndex}`} className="flex items-start gap-2 border-b border-gray-100 pb-2.5">
                        <div className="w-4 h-4 rounded border border-brand flex items-center justify-center bg-transparent shrink-0 mt-0.5">
                          <span className="text-brand text-[10px] font-bold leading-none">✓</span>
                        </div>
                        <span className="text-[11px] font-medium text-gray-900 leading-tight flex-1 break-words">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <div>
              <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-2 pb-2 border-b border-gray-100">Wykonawca / Instalator</h3>
              <input className="mp-editable text-xs font-bold text-gray-950 mt-2" value={metadata.contractor || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, contractor: e.target.value })} />
              <p className="text-[9px] text-gray-400 mt-1.5">Podmiot odpowiedzialny za montaż instalacji</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 flex flex-col justify-center">
            <div>
              <h3 className="text-[10px] font-bold text-brand uppercase tracking-widest mb-2 pb-2 border-b border-gray-100">Uprawnienia SEP (Kwalifikacyjne)</h3>
              <div className="text-xs flex flex-col gap-2 mt-2">
                <div className="flex items-baseline">
                  <span className="font-semibold text-gray-700 w-[110px]">Eksploatacja (E):</span>
                  <input className="mp-editable text-gray-950 font-bold ml-1 flex-grow" value={metadata.designerId || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, designerId: e.target.value })} />
                </div>
                <div className="flex items-baseline">
                  <span className="font-semibold text-gray-700 w-[110px]">Dozór (D):</span>
                  <input className="mp-editable text-gray-950 font-bold ml-1 flex-grow" value={metadata.authorLicense || ""} placeholder="................................" onChange={(e) => onChange({ ...metadata, authorLicense: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-brand text-gray-800 rounded-xl p-4 mb-6 text-center shadow-sm">
          <p className="text-[10px] uppercase font-bold text-brand tracking-wider mb-2 pb-2 border-b border-gray-100">Pełna treść oświadczenia wykonawcy</p>
          <p className="text-[10px] leading-relaxed font-normal text-gray-800">
            Oświadczam, że instalacja elektryczna w wyżej wymienionym obiekcie została wykonana zgodnie z przepisami ustawy Prawo Budowlane, obowiązującymi normami technicznymi (w tym <span className="font-bold text-gray-950">PN-HD 60364-6</span>) oraz sztuką budowlaną. Przeprowadzone pomiary odbiorcze wykazały skuteczność zastosowanych środków ochrony przeciwporażeniowej.
          </p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-end pt-4 border-t border-gray-100">
          <div className="text-center w-64">
            <div className="h-20 border border-dashed border-gray-300 rounded-lg flex items-center justify-center p-2 mb-1 bg-gray-50/30 mx-auto w-full">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">{stampText}</span>
            </div>
          </div>
          <div className="text-center w-64">
            <div className="h-16 flex items-center justify-center">
              <span className="text-[10px] text-gray-300 italic">miejsce na podpis</span>
            </div>
            <div className="border-t border-gray-300 pt-1.5">
              <p className="text-[10px] font-bold text-gray-700 uppercase">Podpis Elektryka</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Osoba uprawniona (pomiarowiec)</p>
            </div>
          </div>
        </div>
        <PageFooter pageNumber={titlePageIndex} totalUiPages={totalUiPages} noBorder />
      </div>
    </div>
  );
}
