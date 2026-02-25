class InventorySystem {
    constructor() {
        this.batteries = 0;
        this.pills = 0;
        this.keys = 0;
        this.loreNotes = [];
        
        this.updateUI();
    }

    addItem(type) {
        if (type === 'battery') this.batteries++;
        if (type === 'pill') this.pills++;
        if (type === 'key') this.keys++;
        this.updateUI();
    }

    useItem(type, lighting, sanity) {
        if (type === 'battery' && this.batteries > 0) {
            this.batteries--;
            lighting.battery = Math.min(100, lighting.battery + 50);
            this.updateUI();
            return true;
        }
        if (type === 'pill' && this.pills > 0) {
            this.pills--;
            sanity.currentSanity = Math.min(sanity.maxSanity, sanity.currentSanity + 40);
            this.updateUI();
            return true;
        }
        return false;
    }

    hasKey() {
        return this.keys > 0;
    }

    useKey() {
        if (this.keys > 0) {
            this.keys--;
            this.updateUI();
            return true;
        }
        return false;
    }

    readLore(noteId) {
        if (!this.loreNotes.includes(noteId)) {
            this.loreNotes.push(noteId);
            // Display lore note on screen (simple alert for now, can be styled later)
            alert("LORE NOTE FOUND:\n\n" + this.getLoreText(noteId));
        }
    }

    getLoreText(id) {
        const lore = {
            'note_1': "Day 4: They roam the halls. The darkness feels heavy, almost alive. Keep the light on.",
            'note_2': "The Warden doesn't just lock doors, he locks minds. Beware the locked gate ahead.",
        };
        return lore[id] || "Illegible scribbles...";
    }

    updateUI() {
        document.getElementById('batt-count').innerText = this.batteries;
        document.getElementById('pill-count').innerText = this.pills;
        document.getElementById('key-count').innerText = this.keys;
    }

    handleInput(engine, lighting, sanity) {
        if (engine.keys['Digit1']) {
            if (!this.bPressed) {
                this.useItem('battery', lighting, sanity);
                this.bPressed = true;
            }
        } else {
            this.bPressed = false;
        }

        if (engine.keys['Digit2']) {
            if (!this.pPressed) {
                this.useItem('pill', lighting, sanity);
                this.pPressed = true;
            }
        } else {
            this.pPressed = false;
        }
    }
}
