import {tokens, EVM_REVERT} from './helpers'
const Token = artifacts.require('./Token')
	

require('chai')
	.use(require('chai-as-promised'))
	.should()

contract('Token', ([deployer, receiver, exchange])=> {
	const name = 'Zion Token'
	const symbol = 'ZION'
	const decimals = '18'
	const totalSupply = tokens(1000000000)

	let token
	beforeEach(async () =>{
		token = await Token.new()
	})

	describe('deployment', () =>{
		it('tracks the name', async () => { 
			 const result = await token.name()
			 result.should.equal(name)
		})

		it('tracks the symbol', async () => { 
			 const result = await token.symbol()
			 result.should.equal(symbol)
		})

		it('tracks the decimals', async () => { 
			 const result = await token.decimals()
			 result.toString().should.equal(decimals)
		})

		it('tracks the supply', async () => { 
			 const result = await token.totalSupply()
			 result.toString().should.equal(totalSupply.toString())
		})

		it('tracks total supply is assigned to deployer', async () => {
			const result = await token.balanceOf(deployer)
			result.toString().should.equal(totalSupply.toString())
		})
	})

	describe('transfer tokens', () => {



		let amount
		let result 

		describe('Success Token transfer', () => {
			beforeEach(async () => {
		amount = tokens(100)
		result = await token.transfer(receiver, amount, {from: deployer})
		})

		it('transfer token balance', async () =>{
		let balanceOf
		//After Transfer
		balanceOf = await token.balanceOf(deployer)
		balanceOf.toString().should.equal(tokens(999999900).toString())
		//console.log("Deployer balance After transfer", balanceOf.toString())
		balanceOf = await token.balanceOf(receiver)
		balanceOf.toString().should.equal(tokens(100).toString())
		//console.log("Receiver balance After transfer", balanceOf.toString())
		})

		it('emit transfer event', async() => {
			const log = result.logs[0]; 
			log.event.should.equal('Transfer')
			const event = log.args;
			event._from.toString().should.equal(deployer, 'from is correct')
			event._to.toString().should.equal(receiver, 'To is correct')
			event._value.toString().should.equal(amount.toString(), 'value is correct')

		})
		})

		describe('Failure Token transfer', async () => {
			 it('reject due to insufficient balance', async() => {
			 	let invalidAmount
			 	invalidAmount = tokens(10000000000) 
			 	await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT)

			 	//Attempt to Transfer when you have none
			 	invalidAmount = tokens(10) 
			 	await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT)
			 })

			 it('rejct due to transefer to invalid address', async() =>{
			 	await token.transfer('0x0000000000000000000000000000000000000000', amount, { from: deployer}).should.be.rejectedWith(EVM_REVERT)
			 })
		})
		
	})

	describe('approve tokens', () => {
		let result 
		let amount

		beforeEach(async() => {
			amount = tokens(100)
			result = await token.approve(exchange, amount.toString(), { from: deployer})
		})

		describe('successsss', () =>{
			it('allocates an allowance for delegated token sending on exchange', async() => {
				const allowance = await token.allowances(deployer, exchange)
				allowance.toString().should.equal(amount.toString())
			})

			it('emit an Approval event', async() => {
			const log = result.logs[0]; 
			log.event.should.equal('Approval')
			const event = log.args;
			event._owner.toString().should.equal(deployer, 'from is correct')
			event._spender.toString().should.equal(exchange, 'To is correct')
			event._value.toString().should.equal(amount.toString(), 'value is correct')

		})
		})

		describe('failure', ()=> {
			it('reject due to gining an approval to invalid address', async() =>{
			 	await token.transfer('0x0000000000000000000000000000000000000000', amount, { from: deployer}).should.be.rejectedWith(EVM_REVERT)
			 })

		})


	})

	describe('transfer From tokens', () => {



		let amount
		let result 

		describe('Delegated Token transfer', () => {
			beforeEach(async () => {
		amount = tokens(100)
		await token.approve(exchange, amount, {from: deployer})
		result = await token.transferFrom(deployer,receiver, amount, {from: exchange})
		})

		it('transfer token balance', async () =>{
		let balanceOf
		//After Transfer
		balanceOf = await token.balanceOf(deployer)
		balanceOf.toString().should.equal(tokens(999999900).toString())
		//console.log("Deployer balance After transfer", balanceOf.toString())
		balanceOf = await token.balanceOf(receiver)
		balanceOf.toString().should.equal(tokens(100).toString())
		//console.log("Receiver balance After transfer", balanceOf.toString())
		})

		it('emit transferFrom event', async() => {
			const log = result.logs[0]; 
			log.event.should.equal('Transfer')
			const event = log.args;
			event._from.toString().should.equal(deployer, 'from is correct')
			event._to.toString().should.equal(receiver, 'To is correct')
			event._value.toString().should.equal(amount.toString(), 'value is correct')

		})
		})

		describe('Failure Token transfer', async () => {
			 it('reject due to insufficient balance', async() => {
			 	let invalidAmount
			 	invalidAmount = tokens(10000000000) 
			 	await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT)

			 // 	//Attempt to Transfer when you have none
			 // 	invalidAmount = tokens(10) 
			 // 	await token.transfer(deployer, invalidAmount, {from: receiver}).should.be.rejectedWith(EVM_REVERT)
			  })

			 it('rejct due to transefer to invalid address', async() =>{
			 	await token.transfer('0x0000000000000000000000000000000000000000', amount, { from: deployer}).should.be.rejectedWith(EVM_REVERT)
			 })
				
	})
})
})