# autocrawler

## Descrição
Esta biblioteca tem o objetivo de juntar vários crawlers das plataformas de compra/venda de automóveis em Portugal (ex: Stand Virtual) numa só ferramenta. Os crawlers navegam plataformas, recolhem informação e exportam um JSON com os dados de todos os carros listados na plataforma em questão.

## Instalação

```bash
npm install --save autocrawler
```

ou

```bash
yarn add autocrawler
```

## Como usar

```javascript
autocrawler(platform, car);
```

```javascript
platform: 'Stand Virtual | ...'
car: {
	brand: 'Car Brand',
	model: 'Car Model' (optional)
}
```

#### Com Promises
```javascript
const autocrawler = require('autocrawler');

autocrawler('Stand Virtual', { brand: 'Fiat', model: 'Punto' })
	.then((response) => {
		console.log(response);
	})
	.catch((error) => {
		console.log(error);
	});
```

### Com await
```javascript
const autocrawler = require('autocrawler');

(async () => {
	const response = await autocrawler('Stand Virtual', { brand: 'Fiat', model: 'Punto' });

	console.log(response);
})();
```

### Exemplo de resposta
```javascript
{
  car: { brand: 'Fiat', model: 'Punto' },
  list: [
    {
      name: 'Fiat Punto 1.3 M-Jet Easy S&S',
      price: 8750,
      km: 54388,
      fuel: 'Diesel',
      year: 2017,
      url: 'https://www.standvirtual.com/anuncio/fiat-punto-1-3-m-jet-easy-s-s-ID8P0e7b.html',
      uid: 'ID8P0e7b'
    },
    {
      name: 'Fiat Punto 1.2 S&amp;S Lounge Navigator 5p',
      price: 8980,
      km: 40348,
      fuel: 'Gasolina',
      year: 2018,
      url: 'https://www.standvirtual.com/anuncio/fiat-punto-1-2-s-amps-lounge-navigator-5p-ID8OXUxU.html',
      uid: 'ID8OXUxU'
    },
	...
  ]
}
```

### Plataformas disponíveis

- Stand Virtual

## Para adicionar
- Validação de marcas e modelos
- Ir buscar mais informações de cada carro (potência, mês de registo, foto, etc)
- Filtrar diretamente por ano, combustível, potência, etc.
- Adicionar novas plataformas (OLX, Custo Justo, Auto Sapo, etc.)
- Novas opções: processar só X páginas, ignorar alguns anúncios, etc.
- Optimizações
- Testes

## Não funciona?
Caso o crawler não esteja a funcionar, o mais provável é que tenha havido alguma alteração no layout da plataforma, o que vai fazer com que o crawler não saiba onde ir buscar as informações necessárias. Neste caso é necessário dar fix ao crawler em questão. Os pull requests estão abertos :)

## Licença
[MIT](https://github.com/bruxo00/autocrawler/blob/main/LICENSE)
