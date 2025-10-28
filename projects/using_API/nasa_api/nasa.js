document.addEventListener("DOMContentLoaded",ini);

let data;
let bt;
function ini(){
    bt=document.getElementById("searchBtn");
    bt.addEventListener("click",richiesta);

    data=document.getElementById("birthdate");
    data.addEventListener("change",check_data);
    
}

function check_data(){

    const dataSelezionata = new Date(data.value);
    const minDate = new Date('1995-06-16');
    const maxDate = new Date();
  

    if (dataSelezionata < minDate) {
        showError('L\'archivio APOD è disponibile solo dal 16 giugno 1995');
        bt.disabled=true;
        return false;
    }

    if (dataSelezionata > maxDate) {
        showError('Non puoi selezionare una data futura');
        bt.disabled=true;
        return false ;
    }

    bt.disabled=false;
    return true;
}


async function richiesta(){

    const dataSelezionata = data.value;
    const url = "https://api.nasa.gov/planetary/apod?";
    const apiKey = 'DEMO_KEY';
    const fullurl = url + "api_key=" + apiKey + "&date=" + dataSelezionata;

    try {
        let r = await fetch(fullurl);
        
        if (r.status === 429) {
            throw new Error("Troppe richieste! Hai raggiunto il limite di DEMO_KEY. Riprova tra un'ora o registrati per una chiave gratuita su https://api.nasa.gov/");
        }

        if (!r.ok) {
            
            let errorData = await r.json();
            throw new Error("Errore nella richiesta: " + (errorData.msg || r.status));
        }

        let j = await r.json();

        const resultDiv = document.getElementById('result');
        
        resultDiv.style.display = "block";
        
        let mediaContent = "";
        if (j.media_type === 'image') {
            mediaContent = `<img src="${j.url}" alt="${j.title}" class="result-image">`;
        } else if (j.media_type === 'video') {
            mediaContent = `<iframe src="${j.url}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
        }

        resultDiv.innerHTML = `
            ${mediaContent}
            <div class="result-content">
                <h2 class="result-title">${j.title}</h2>
                <p class="result-date">📅 ${j.date}</p>
                <p class="result-explanation">${j.explanation}</p>
                ${j.copyright ? `<p style="margin-top: 20px; font-style: italic; color: #888;">© ${j.copyright}</p>` : ''}
                <button><a href="../project_index.html">Torna Indietro</a></button>
            </div>
        `;
        
    } catch (error) {
        console.error("Errore completo:", error); // ← Debug
        showError(error.message); 
    }
}

function showError(str){
    document.getElementById("ack").innerHTML = `<p style="color:red;">Errore: ${str}</p>`;

}