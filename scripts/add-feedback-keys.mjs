import fs from 'fs/promises';

async function fixFeedbackKeys() {
    const plMain = JSON.parse(await fs.readFile('src/locales/pl/translation.json', 'utf8'));
    const deMain = JSON.parse(await fs.readFile('src/locales/de/translation.json', 'utf8'));

    const plAdd = {
        "app.feedbackModal.closeAria": "Zamknij",
        "app.feedbackModal.title": "Zgłoś błąd lub pomysł",
        "app.feedbackModal.successTitle": "Wysłano pomyślnie!",
        "app.feedbackModal.successDesc": "Dziękujemy za Twoją opinię. Wiadomość została przekazana do twórcy.",
        "app.feedbackModal.closeBtn": "Zamknij okno",
        "app.feedbackModal.typeLabel": "Rodzaj zgłoszenia",
        "app.feedbackModal.typeError": "Zgłoszenie błędu",
        "app.feedbackModal.typeIdea": "Propozycja zmiany / nowa funkcja",
        "app.feedbackModal.typeOther": "Pytanie / Inne",
        "app.feedbackModal.emailLabel": "Twój e-mail (opcjonalnie)",
        "app.feedbackModal.emailPlaceholder": "np. jan@kowalski.pl",
        "app.feedbackModal.emailHint": "Zostaw e-mail, jeśli chcesz otrzymać odpowiedź od autora.",
        "app.feedbackModal.messageLabel": "Treść wiadomości *",
        "app.feedbackModal.messagePlaceholder": "Opisz dokładnie swój problem lub pomysł...",
        "app.feedbackModal.errorMsg": "Wystąpił błąd podczas wysyłania. Sprawdź połączenie z internetem.",
        "app.feedbackModal.btnSubmitting": "Wysyłanie...",
        "app.feedbackModal.btnSubmit": "Wyślij wiadomość",
        "app.mobileDrawer.feedback": "Zgłoś pomysł / Błąd"
    };

    const deAdd = {
        "app.feedbackModal.closeAria": "Schließen",
        "app.feedbackModal.title": "Fehler oder Idee melden",
        "app.feedbackModal.successTitle": "Erfolgreich gesendet!",
        "app.feedbackModal.successDesc": "Vielen Dank für Ihr Feedback. Die Nachricht wurde an den Entwickler weitergeleitet.",
        "app.feedbackModal.closeBtn": "Fenster schließen",
        "app.feedbackModal.typeLabel": "Art der Meldung",
        "app.feedbackModal.typeError": "Fehlermeldung",
        "app.feedbackModal.typeIdea": "Änderungsvorschlag / Neue Funktion",
        "app.feedbackModal.typeOther": "Frage / Sonstiges",
        "app.feedbackModal.emailLabel": "Ihre E-Mail (optional)",
        "app.feedbackModal.emailPlaceholder": "z.B. max@mustermann.de",
        "app.feedbackModal.emailHint": "Hinterlassen Sie eine E-Mail, wenn Sie eine Antwort vom Autor erhalten möchten.",
        "app.feedbackModal.messageLabel": "Nachrichteninhalt *",
        "app.feedbackModal.messagePlaceholder": "Beschreiben Sie Ihr Problem oder Ihre Idee detailliert...",
        "app.feedbackModal.errorMsg": "Beim Senden ist ein Fehler aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.",
        "app.feedbackModal.btnSubmitting": "Senden...",
        "app.feedbackModal.btnSubmit": "Nachricht senden",
        "app.mobileDrawer.feedback": "Idee / Fehler melden"
    };

    Object.assign(plMain, plAdd);
    Object.assign(deMain, deAdd);

    await fs.writeFile('src/locales/pl/translation.json', JSON.stringify(plMain, null, 2), 'utf8');
    await fs.writeFile('src/locales/de/translation.json', JSON.stringify(deMain, null, 2), 'utf8');
}

fixFeedbackKeys().catch(console.error);
