(async () => {
    try {
        const resHtml = new Response("<html></html>");
        await resHtml.json();
    } catch(e) {
        console.log("HTML parse error:", e.message);
    }
    try {
        const resEmpty = new Response("");
        await resEmpty.json();
    } catch(e) {
        console.log("Empty parse error:", e.message);
    }
})();
