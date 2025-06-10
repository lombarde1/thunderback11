#!/bin/bash

# Remove o diretório .git
rm -rf .git

# Inicializa o git novamente
git init

# Adiciona todos os arquivos
git add .

# Commit inicial
git commit -am 'att'

# Pergunta o número da plataforma
read -p "Qual o número da plataforma? " numero

# Cria o repositório no GitHub com gh CLI
gh repo create lombarde1/thunderback"$numero" --public --description "Br" --source=. --push
