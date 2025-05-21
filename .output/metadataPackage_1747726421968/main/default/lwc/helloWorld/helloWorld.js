export default class HelloWorld extends LightningElement {
    greeting = 'Hello World';
    
    get message() {
        return `${this.greeting}!`;
    }
}