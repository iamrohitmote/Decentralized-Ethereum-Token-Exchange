pragma solidity ^0.5.0;

import "./Token.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Exchange {
    using SafeMath for uint256;

    //Variables
    address public feeAccount; //the account that receives fees
    uint256 public feePercent; //% fees of Exchange
    address constant ETHER = address(0); //Store ether in tokens mapping with blank address
    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    uint256 public orderCount;
    //Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(
        address token,
        address user,
        uint256 amount,
        uint256 balance
    );

    event Order(
         uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
        );

     event Cancel(
         uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive,
        uint256 timestamp
        );


     event Trade(
         uint256 id,
        address user,
        address tokenGet,
        uint256 amountGet,
        address tokenGive,
        uint256 amountGive, 
        address userFill,
        uint256 timestamp
        );
    //way to model the order

    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    //way to store the order on bloackchain

    //way to add order to storage 
    constructor(address _feeAccount, uint256 _feePercent) public {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    function() external {
        revert();
    }

    //Deposit ether
    function depositEther() public payable {
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].add(msg.value);
        //emit an event
        //args - (which) token address, who deposited it on exchange, amount of tokens, updated token balance for that user
        emit Deposit(ETHER, msg.sender, msg.value, tokens[ETHER][msg.sender]);
    }

    function withdrawEther(uint256 _amount) public {
        require(tokens[ETHER][msg.sender] >= _amount);
        msg.sender.transfer(_amount);
        tokens[ETHER][msg.sender] = tokens[ETHER][msg.sender].sub(_amount);
        emit Withdraw(ETHER, msg.sender, _amount, tokens[ETHER][msg.sender]);
    }

    //deposit tokens on exchange

    function depositToken(address _token, uint256 _amount) public {
        //check if it's ether address
        require(_token != ETHER);
        //Don't allow ether deposits

        //send token to contract of exchange
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));

        //Track balance and manage deposit
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);

        //emit an event
        //args - (which) token address, who deposited it on exchange, amount of tokens, updated token balance for that user
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(_token != ETHER);
        require(tokens[_token][msg.sender] >= _amount);
        require(Token(_token).transfer(msg.sender, _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256)
    {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        orderCount= orderCount.add(1);
        orders[orderCount] = _Order(orderCount  , msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);  
        emit Order(orderCount  , msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, now);
    }

    function cancelOrder(uint256 _id) public {
        _Order storage _order = orders[_id];
        //Must be My order
        require(address(_order.user) == msg.sender );
        //Must be a valid order
        require(_order.id == _id);
        orderCancelled[_id] = true;
        emit Cancel(_order.id  , msg.sender, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, now);

    }

    function fillOrder(uint256 _id) public {

        //check if order id is valid and  should NOT HAVE BEEN cancelled or filled already
        require(_id !=0 && _id <= orderCount);
        require(!orderCancelled[_id]);
        require(!orderFilled[_id]);

        //fetch the order
         _Order storage _order = orders[_id];
         _trade(_order.id  , _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);

       
        //mark order as filled
        orderFilled[_id] = true;
    }

    function _trade(uint256 _id  ,address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        
        //fees paid the user that fills order i.e msg.sender
        //fee amount dedecuted from _amountGet
        uint256 _feeAmount = _amountGive.mul(feePercent).div(100);

        //execute trade
        //user is the one who created the order
        //msg.sender is the one who is filling this order
        //msg.sender will pay for amount+fees
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);

        //charge fees
        //fees will get deposited in FeeAccount
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);

        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);


        //emit trade event
        emit Trade(_id  , _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, now);

    }
}
