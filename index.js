const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const readline = require('readline');


// Função para carregar os dados a partir do arquivo CSV
async function loadCSVData(filePath) {
    return new Promise((resolve, reject) => {
        const data = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                data.push(row);
            })
            .on('end', () => {
                resolve(data);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

// Função para preparar os dados para treinamento
function prepareData(data) {
    const inputs = [];
    const targets = [];

    data.forEach((row) => {
        inputs.push([
            parseFloat(row.bedrooms),
            parseFloat(row.bathrooms),
            parseFloat(row.sqft_living),
        ]);
        targets.push(parseFloat(row.price));
    });

    const inputTensor = tf.tensor2d(inputs);
    const targetTensor = tf.tensor2d(targets, [targets.length, 1]);

    return { inputs: inputTensor, targets: targetTensor };
}

// Função para criar o modelo de rede neural
function createModel() {
    console.log('> [House Price Prediction] Criando Modelo...');
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 10, inputShape: [3], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1 }));

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    return model;
}
// Função para salvar o modelo em um arquivo
async function saveModel(model, filePath) {
    console.log('> [House Price Prediction] Salvando Modelo...');

    // Salve o modelo como arquivo JSON
    const modelJSON = model.toJSON();
    fs.writeFileSync(filePath, JSON.stringify(modelJSON));

    // Salve os pesos do modelo como um arquivo binário
    const artifacts = await model.save(tf.io.withSaveHandler(async (filePath) => {
        const weightData = tf.io.encodeWeights(model.weights);
        const buffer = Buffer.from(await weightData.buffer());

        fileSystem.writeFileSync(`${filePath}.weights.bin`, new Uint8Array(buffer));
    }));

    console.log('Modelo salvo com sucesso:', filePath);

    // const modelData = await model.save(tf.io.withSaveHandler(async (artifacts) => {
    //     console.log(artifacts.weightData);
    //     await fs.promises.writeFile(filePath, JSON.stringify(artifacts.modelTopology));
    //     // Salve os pesos do modelo como um arquivo binário
    //     const artifacts = await model.save(tf.io.withSaveHandler(async (filePath) => {
    //         const weightData = tf.io.encodeWeights(model.weights);
    //         const buffer = Buffer.from(await weightData.buffer());

    //         fileSystem.writeFileSync(`${filePath}.weights.bin`, new Uint8Array(buffer));
    //     }));

    // }));
    // console.log('Modelo salvo com sucesso!');
}

// Função para carregar o modelo de um arquivo
async function loadModel(filePath) {

    console.log('> [House Price Prediction] Carregando Modelo...');
    const weightData = await fs.promises.readFile(`${filePath}.weights.bin`);
    const modelTopology = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

    const model = await tf.loadLayersModel(tf.io.fromMemory(modelTopology, weightData));

    console.log('Modelo carregado com sucesso!');
    return model;
}


// Função para treinar o modelo
async function trainModel(model, inputs, targets) {
    console.log('> [House Price Prediction] Treinando Modelo...');
    await model.fit(inputs, targets, {
        epochs: 100,
        shuffle: true,
        callbacks: tf.callbacks.earlyStopping({ patience: 10 }),
    });
}

// Função para fazer previsões com o modelo treinado
function predict(model, inputs) {
    console.log('> [House Price Prediction] Realizando as Previsões...');
    const predictions = model.predict(inputs);
    return predictions.dataSync();
}

// Função principal
async function run() {
    const data = await loadCSVData('house_prices.csv');
    const { inputs, targets } = prepareData(data);

    const model = createModel();
    await trainModel(model, inputs, targets);

    // let model;
    // if (fs.existsSync('model.json')) {
    //     model = await loadModel('model.json');
    // } else {
    //     model = createModel();
    //     await trainModel(model, inputs, targets);
    //     await saveModel(model, 'model.json');
    // }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const inputArray = [];

    rl.question('Digite o número de quartos: ', (bedrooms) => {
        inputArray.push(parseFloat(bedrooms));

        rl.question('Digite o número de banheiros: ', (bathrooms) => {
            inputArray.push(parseFloat(bathrooms));

            rl.question('Digite o tamanho em pés quadrados: ', (size_sqft) => {
                inputArray.push(parseFloat(size_sqft));

                rl.close();

                const testInputs = tf.tensor2d([inputArray]);
                const predictions = predict(model, testInputs);
                
                var formatted = predictions[0].toLocaleString('pt-br',{style: 'currency', currency: 'BRL'});
                console.log('Previsão:', formatted);
            });
        });
    });
}

// Executa a função principal
run();
