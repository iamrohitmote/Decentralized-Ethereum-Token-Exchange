import { ether, tokens, EVM_REVERT, ETHER_ADDRESS } from './helpers'

const Token = artifacts.require('./Token')
const Exchange = artifacts.require('./Exchange')


require('chai')
    .use(require('chai-as-promised'))
    .should()

contract('Exchange', ([deployer, feeAccount, user1, user2]) => {

    let exchange
    let token
    const feePercent = 10;

    beforeEach(async () => {
        //deploy token 
        token = await Token.new()

        //deploy
        exchange = await Exchange.new(feeAccount, feePercent)

        //transfer few tokens to user1 so that it can give approval to exchange 
        //for making further transfers in his behalf
        token.transfer(user1, tokens(100), { from: deployer })
    })

    describe('deployment', () => {
        it('tracks the feeAccount', async () => {
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it('tracks the feePercent', async () => {
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('fallback', () => {
        it('reverts wehn ether is sent', async () => {
            await exchange.sendTransaction({ value: 1, from: user1 }).should.be.rejectedWith(EVM_REVERT)
        })
    })

    describe('deposit ether', () => {

        let amount
        let result

        describe('success', () => {
            beforeEach(async () => {
                amount = ether(0.01)
                result = await exchange.depositEther({ from: user1, value: amount })
            })

            it('track ether deposits', async () => {
                // //check exchange token balance
                let balance
                // balance = await token.balanceOf(exchange.address)
                // balance.toString().should.equal(amount.toString())

                //check balance of token on exchange 
                balance = await exchange.tokens(ETHER_ADDRESS, user1)
                balance.toString().should.equal(amount.toString())

            })

            it('emit Deposit event', async () => {
                const log = result.logs[0];
                //console.log(log);
                log.event.should.equal('Deposit')
                const event = log.args;
                event.token.toString().should.equal(ETHER_ADDRESS, 'from is correct')
                event.user.toString().should.equal(user1, 'To is correct')
                event.amount.toString().should.equal(amount.toString(), 'value is correct')
                event.balance.toString().should.equal(amount.toString(), 'balance is correct')
            })

            describe('failure', () => {

            })

        })
    })

    describe('withdraw ether', () => {

        let result
        let amount

        beforeEach(async () => {
            amount = ether(1)
            await exchange.depositEther({ from: user2, value: amount })
        })

        describe('success', async () => {
            beforeEach(async () => {

                result = await exchange.withdrawEther(amount, { from: user2 })
            })


            it('withdraw ether', async () => {
                const balance = await exchange.tokens(ETHER_ADDRESS, user2)
                balance.toString().should.equal('0')
            })

            it('emit withdraw event', async () => {
                const log = result.logs[0];
                //console.log(log)
                log.event.should.equal('Withdraw')
                const event = log.args;
                event.token.toString().should.equal(ETHER_ADDRESS, ' from is correct')
                event.user.toString().should.equal(user2, 'to address is correct')
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal('0')

            })

        })
        describe('failure', async () => {
            it('reject withdrwas if insufficient balance', async () => {
                await exchange.withdrawEther(ether(100), { from: user2 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('depositing tokens', () => {

        let result
        let amount


        describe('success', () => {

            beforeEach(async () => {
                amount = tokens(10)
                await token.approve(exchange.address, amount, { from: user1 })
                result = await exchange.depositToken(token.address, tokens(10), { from: user1 })
            })

            it('tracks token deposits', async () => {
                //check exchange token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                //check balance of token on exchange 
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())

            })

            it('emit Deposit event', async () => {
                const log = result.logs[0];
                //console.log(log);
                log.event.should.equal('Deposit')
                const event = log.args;
                event.token.toString().should.equal(token.address, 'from is correct')
                event.user.toString().should.equal(user1, 'To is correct')
                event.amount.toString().should.equal(amount.toString(), 'value is correct')
                event.balance.toString().should.equal(amount.toString())
            })
        })

        // it('check success of deposit token', async() => {
        // 	let balance
        // 	balance = exchange.depositToken(token.address, amount, { from: exchange})
        // 	balance = await token.balanceOf(user1)
        // 	balance.toString().should.equal(amount.toString())

        // })


        describe('failure', () => {

            it('reject ether deposits', async () => {
                await exchange.depositToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)

            })

            it('fail when no tokens are approved', async () => {
                //don't approve any tokens before depositing 
                await exchange.depositToken(token.address, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })

    })

    describe('withdraw tokens', () => {

        let result
        let amount





        describe('success', async () => {
            beforeEach(async () => {
                amount = tokens(1)
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })
                result = await exchange.withdrawToken(token.address, amount, { from: user1 })
            })


            it('withdraw token funds', async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')
            })

            it('emit withdraw event', async () => {
                const log = result.logs[0];
                //console.log(log)
                log.event.should.equal('Withdraw')
                const event = log.args;
                event.token.toString().should.equal(token.address.toString(), ' from is correct')
                event.user.toString().should.equal(user1, 'to address is correct')
                event.amount.toString().should.equal(amount.toString())
                event.balance.toString().should.equal('0')

            })

        })
        describe('failure', async () => {

            it('reject ether withdraw', async () => {
                await exchange.withdrawToken(ETHER_ADDRESS, tokens(10), { from: user1 }).should.be.rejectedWith(EVM_REVERT)

            })

            it('reject withdrwas if insufficient balance', async () => {
                await exchange.withdrawToken(token.address, tokens(100), { from: user1 }).should.be.rejectedWith(EVM_REVERT)
            })
        })
    })

    describe('checking balances', async () => {
        let amount
        let result
        beforeEach(async () => {
            amount = ether(0.01)
            await exchange.depositEther({ from: user2, value: amount })
        })

        it('returns user balance', async () => {
            result = await exchange.balanceOf(ETHER_ADDRESS, user2)


            result.toString().should.equal(amount.toString())
        })

    })

    describe('make orders', () => {
        let result
        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })
        })

        it('check newly created order count', async () => {
            const orderCount = await exchange.orderCount();
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('1')
            order.id.toString().should.equal('1', 'id is correct')
            order.user.should.equal(user1, 'user is correct')
            order.tokenGet.should.equal(token.address, ' tokenGet is correct')
            order.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
            order.tokenGive.should.equal(ETHER_ADDRESS, ' tokenGive is correct')
            order.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
            order.timestamp.toString().length.should.be.at.least(1, 'timestamp is correct')
        })

        it('check if emits an "Order event', async () => {
            const log = result.logs[0];
            log.event.should.equal('Order')
            const event = log.args;
            event.id.toString().should.equal('1', 'id is correct')
            event.user.should.equal(user1, 'user is correct')
            event.tokenGet.should.equal(token.address, ' tokenGet is correct')
            event.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
            event.tokenGive.should.equal(ETHER_ADDRESS, ' tokenGive is correct')
            event.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
            event.timestamp.toString().length.should.be.at.least(1, 'timestamp is correct')
        })

    })

    describe('order actions', () => {
        beforeEach(async () => {
            //user1 deposits ether
            await exchange.depositEther({ from: user1, value: ether(1) })

            //give tokens to user2
            await token.transfer(user2, tokens(100), { from: deployer})

            //user2 deposits tokens only
            await token.approve(exchange.address, tokens(2), { from: user2})
            await exchange.depositToken(token.address, tokens(2), { from: user2})

            //user1 makes an order to buy tokens with ether
            await exchange.makeOrder(token.address, tokens(1), ETHER_ADDRESS, ether(1), { from: user1 })

        })

        describe('filling orders', async() => {
        	let result

        	describe('success', async() => {
        		beforeEach(async() => {
        			//user2 fills order as he has tokens that user1 wants to buy
        			result = await exchange.fillOrder('1',{ from: user2})
        		})

        		it('execute trade and charge fees', async() => {
        			let balance
        			balance = await exchange.balanceOf(token.address, user1)
        			balance.toString().should.equal(tokens(1).toString(), 'user1 received tokens from user2')
        			balance = await exchange.balanceOf(ETHER_ADDRESS, user2)
        			balance.toString().should.equal(ether(1).toString(), 'user2 received ether from user1')
        			balance = await exchange.balanceOf(ETHER_ADDRESS, user1)
        			balance.toString().should.equal(ether(0).toString(), 'user1  ether deduted after transferring to  user2')
        			balance = await exchange.balanceOf(token.address, user2)
        			balance.toString().should.equal(tokens(0.9).toString(), 'user2 tokens dedcuted with fee applied')
        			const feeAccount = await exchange.feeAccount()
        			balance = await exchange.balanceOf(token.address, feeAccount)
        			balance.toString().should.equal(tokens(0.1).toString(),'feeAccount received 10% i.1 0.1 token')
        		})

        		it('update filled orders', async() => {
        			const orderFilled = await exchange.orderFilled(1)
        			orderFilled.should.equal(true)
        		})

        		it('emits a Trade event', async() => {
        			const log = result.logs[0];
                    log.event.should.equal('Trade')
                    const event = log.args;
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, ' tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, ' tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
                    event.userFill.should.equal(user2,'userFill is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is correct')
        		})

        	})

        	describe('failure', async() => {
        		it('reject invalid oreder ids', async() => {
        			const invalidOrderId = 1000000
        			await exchange.fillOrder(invalidOrderId, {from: user2}).should.be.rejectedWith(EVM_REVERT)
        		})

        		it('reject already filled order', async() => {
        			//fill the order first
        			await exchange.fillOrder('1', {from: user2}).should.be.fulfilled

        			//try to fill order again
        			await exchange.fillOrder('1', {from: user2}).should.be.rejectedWith(EVM_REVERT)
        		})

        		it('reject cancelled order', async() => {

        			//user1 cancels the order first
        			await exchange.cancelOrder('1', {from: user1}).should.be.fulfilled

        			//user2 tries to fill the order which is already cancelled by user1 and hence shoudl be rejected
        			await  exchange.fillOrder('1', {from: user2}).should.be.rejectedWith(EVM_REVERT)
        		})
        	})


        })

        describe('canelling orders', async () => {
            let result

            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder(1, { from: user1 })
                })

                it('update cancelled order', async () => {
                    const orderCancelled = await exchange.orderCancelled(1)
                    orderCancelled.should.equal(true)
                })

                it('check if emits a Cancel event', async () => {
                    const log = result.logs[0];
                    log.event.should.equal('Cancel')
                    const event = log.args;
                    event.id.toString().should.equal('1', 'id is correct')
                    event.user.should.equal(user1, 'user is correct')
                    event.tokenGet.should.equal(token.address, ' tokenGet is correct')
                    event.amountGet.toString().should.equal(tokens(1).toString(), 'amount get is correct')
                    event.tokenGive.should.equal(ETHER_ADDRESS, ' tokenGive is correct')
                    event.amountGive.toString().should.equal(ether(1).toString(), 'amount give is correct')
                    event.timestamp.toString().length.should.be.at.least(1, 'timestamp is correct')
                })
            })

            describe('failure', async () => {
                it('reject ordwer with invalid id', async () => {
                    const invalidOrderId = 100000
                    await exchange.cancelOrder(invalidOrderId, { from: user1 }).should.be.rejectedWith(EVM_REVERT)
                })

                it('reject cancellation order with unauthorised user', async () => {
                    await exchange.cancelOrder('1', { from: user2 }).should.be.rejectedWith(EVM_REVERT)
                })
            })
        })
    })
})