from pathlib import Path
import joblib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from loguru import logger
import json

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "sentiment_model.joblib"

modelo = joblib.load(MODEL_PATH)

app = FastAPI(title="API de Sentimento", version='0.1.0')

# Permite que o frontend (aberto em outra origem, ex.: Live Server ou file://) chame a API.
# Em produção, troque "*" pela URL exata do frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class Entrada(BaseModel):
    texto: str = Field(min_length=3, max_length=1000, examples=['Adorei o produto!'])

class Saida(BaseModel):
    sentimento: str
    confianca: float
    versao_modelo: str

@app.get("/health", summary="Verifica a saúde da API")

def health():
    return {"status": "ok", "versao_modelo": "0.1.0"}

@app.post("/predict", response_model=Saida, summary="Realiza a predição do sentimento")
def predict(entrada: Entrada):
    probas = modelo.predict_proba([entrada.texto])[0]
    i = int(probas.argmax())
    resultado = Saida(
        sentimento=modelo.classes_[i],
        confianca=round(float(probas[i]),4),
        versao_modelo="0.1.0"
    )
    logger.info(json.dumps({
        "texto": "Predição",
        "sentimento": resultado.sentimento,
        "confianca": resultado.confianca,
        "tamanho_texto": len(entrada.texto),
        "versao_modelo": resultado.versao_modelo
    }, ensure_ascii=False))
    return resultado