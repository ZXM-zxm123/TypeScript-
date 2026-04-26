// 游戏主题定义
const themes = {
  day: {
    background: '#87CEEB',
    ground: '#8B4513',
    basket: '#FF6347',
    basketBorder: '#8B0000',
    text: '#000000'
  },
  night: {
    background: '#191970',
    ground: '#2F4F4F',
    basket: '#4169E1',
    basketBorder: '#000080',
    text: '#FFFFFF'
  },
  tropical: {
    background: '#00CED1',
    ground: '#FF8C00',
    basket: '#FF69B4',
    basketBorder: '#C71585',
    text: '#8B4513'
  }
};

// 掉落物品类型
type ItemType = 'gold' | 'diamond' | 'bomb' | 'magnet' | 'timeStop';

// 掉落物品接口
interface FallingItem {
  x: number;
  y: number;
  radius: number;
  type: ItemType;
  speed: number;
}

// 游戏状态
type GameState = 'start' | 'playing' | 'end';

// 游戏类
class GoldCatcherGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  // 游戏状态
  private gameState: GameState = 'start';
  private score: number = 0;
  private lives: number = 3;
  private timeLeft: number = 60;
  private combo: number = 0;
  private highScore: number = 0;
  
  // 篮子属性
  private basket: {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
  };
  
  // 掉落物品
  private items: FallingItem[] = [];
  private itemSpawnInterval: number = 1000; // 毫秒
  private lastItemSpawn: number = 0;
  
  // 游戏控制
  private keysPressed: { [key: string]: boolean } = {};
  private mouseX: number;
  
  // 道具效果
  private magnetActive: boolean = false;
  private magnetEndTime: number = 0;
  private timeStopActive: boolean = false;
  private timeStopEndTime: number = 0;
  
  // 难度
  private baseSpeed: number = 2;
  private currentSpeedMultiplier: number = 1;
  
  // 计时器
  private gameStartTime: number = 0;
  private lastTimeUpdate: number = 0;
  private lastDifficultyIncrease: number = 0;
  
  // 主题
  private currentTheme: keyof typeof themes = 'day';
  
  // UI 元素
  private startScreen: HTMLElement;
  private endScreen: HTMLElement;
  private scoreDisplay: HTMLElement;
  private livesDisplay: HTMLElement;
  private timeDisplay: HTMLElement;
  private comboDisplay: HTMLElement;
  private highScoreDisplay: HTMLElement;
  private finalScoreDisplay: HTMLElement;
  private finalHighScoreDisplay: HTMLElement;
  private powerUpStatus: HTMLElement;
  
  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // 初始化篮子
    this.basket = {
      x: this.width / 2 - 50,
      y: this.height - 60,
      width: 100,
      height: 40,
      speed: 8
    };
    
    this.mouseX = this.width / 2;
    
    // 获取 UI 元素
    this.startScreen = document.getElementById('startScreen')!;
    this.endScreen = document.getElementById('endScreen')!;
    this.scoreDisplay = document.getElementById('score')!;
    this.livesDisplay = document.getElementById('lives')!;
    this.timeDisplay = document.getElementById('time')!;
    this.comboDisplay = document.getElementById('combo')!;
    this.highScoreDisplay = document.getElementById('highScore')!;
    this.finalScoreDisplay = document.getElementById('finalScore')!;
    this.finalHighScoreDisplay = document.getElementById('finalHighScore')!;
    this.powerUpStatus = document.getElementById('powerUpStatus')!;
    
    // 加载最高分
    this.loadHighScore();
    
    // 设置事件监听器
    this.setupEventListeners();
    
    // 开始渲染循环
    requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  // 加载最高分
  private loadHighScore(): void {
    const saved = localStorage.getItem('goldCatcherHighScore');
    if (saved) {
      this.highScore = parseInt(saved);
      this.highScoreDisplay.textContent = this.highScore.toString();
    }
  }
  
  // 保存最高分
  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('goldCatcherHighScore', this.highScore.toString());
      this.highScoreDisplay.textContent = this.highScore.toString();
    }
  }
  
  // 设置事件监听器
  private setupEventListeners(): void {
    // 键盘事件
    window.addEventListener('keydown', (e) => {
      this.keysPressed[e.key] = true;
    });
    
    window.addEventListener('keyup', (e) => {
      this.keysPressed[e.key] = false;
    });
    
    // 鼠标移动事件
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });
    
    // 开始按钮
    document.getElementById('startButton')!.addEventListener('click', () => {
      const selectedTheme = document.querySelector('input[name="theme"]:checked') as HTMLInputElement;
      this.currentTheme = selectedTheme.value as keyof typeof themes;
      this.startGame();
    });
    
    // 重新开始按钮
    document.getElementById('restartButton')!.addEventListener('click', () => {
      this.startGame();
    });
  }
  
  // 开始游戏
  private startGame(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.lives = 3;
    this.timeLeft = 60;
    this.combo = 0;
    this.items = [];
    this.currentSpeedMultiplier = 1;
    this.magnetActive = false;
    this.timeStopActive = false;
    
    this.basket.x = this.width / 2 - 50;
    this.basket.y = this.height - 60;
    
    this.gameStartTime = performance.now();
    this.lastTimeUpdate = this.gameStartTime;
    this.lastDifficultyIncrease = this.gameStartTime;
    this.lastItemSpawn = this.gameStartTime;
    
    this.updateUI();
    
    this.startScreen.style.display = 'none';
    this.endScreen.style.display = 'none';
  }
  
  // 结束游戏
  private endGame(): void {
    this.gameState = 'end';
    this.saveHighScore();
    
    this.finalScoreDisplay.textContent = this.score.toString();
    this.finalHighScoreDisplay.textContent = this.highScore.toString();
    this.endScreen.style.display = 'flex';
  }
  
  // 更新 UI
  private updateUI(): void {
    this.scoreDisplay.textContent = this.score.toString();
    this.livesDisplay.textContent = this.lives.toString();
    this.timeDisplay.textContent = this.timeLeft.toString();
    this.comboDisplay.textContent = this.combo.toString();
    
    // 更新道具状态
    let statusText = '';
    if (this.magnetActive) {
      statusText += '磁铁激活中 ';
    }
    if (this.timeStopActive) {
      statusText += '时间停止中 ';
    }
    this.powerUpStatus.textContent = statusText;
  }
  
  // 生成随机物品
  private spawnItem(): void {
    const types: ItemType[] = ['gold', 'gold', 'gold', 'diamond', 'bomb', 'magnet', 'timeStop'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let radius: number;
    switch (type) {
      case 'gold':
        radius = 15;
        break;
      case 'diamond':
        radius = 12;
        break;
      case 'bomb':
        radius = 18;
        break;
      case 'magnet':
        radius = 14;
        break;
      case 'timeStop':
        radius = 14;
        break;
      default:
        radius = 15;
    }
    
    const item: FallingItem = {
      x: Math.random() * (this.width - radius * 2) + radius,
      y: -radius,
      radius: radius,
      type: type,
      speed: this.baseSpeed * this.currentSpeedMultiplier * (0.8 + Math.random() * 0.4)
    };
    
    this.items.push(item);
  }
  
  // 处理输入
  private handleInput(): void {
    // 键盘控制
    if (this.keysPressed['ArrowLeft'] || this.keysPressed['a'] || this.keysPressed['A']) {
      this.basket.x -= this.basket.speed;
    }
    if (this.keysPressed['ArrowRight'] || this.keysPressed['d'] || this.keysPressed['D']) {
      this.basket.x += this.basket.speed;
    }
    
    // 鼠标控制
    const targetX = this.mouseX - this.basket.width / 2;
    this.basket.x += (targetX - this.basket.x) * 0.15;
    
    // 限制篮子在画布内
    if (this.basket.x < 0) {
      this.basket.x = 0;
    }
    if (this.basket.x + this.basket.width > this.width) {
      this.basket.x = this.width - this.basket.width;
    }
  }
  
  // 更新游戏状态
  private update(currentTime: number): void {
    if (this.gameState !== 'playing') {
      return;
    }
    
    // 检查道具效果（在处理时间之前）
    if (this.magnetActive && currentTime > this.magnetEndTime) {
      this.magnetActive = false;
    }
    if (this.timeStopActive && currentTime > this.timeStopEndTime) {
      this.timeStopActive = false;
    }
    
    // 更新计时器（仅在时间停止不激活时）
    if (!this.timeStopActive && currentTime - this.lastTimeUpdate >= 1000) {
      this.timeLeft--;
      this.lastTimeUpdate = currentTime;
      
      // 检查游戏结束
      if (this.timeLeft <= 0 || this.lives <= 0) {
        this.endGame();
        return;
      }
      
      // 增加难度（每10秒）
      if (currentTime - this.lastDifficultyIncrease >= 10000) {
        this.currentSpeedMultiplier += 0.2;
        this.lastDifficultyIncrease = currentTime;
      }
    }
    
    // 处理输入
    this.handleInput();
    
    // 生成物品（时间停止时也继续生成）
    if (currentTime - this.lastItemSpawn >= this.itemSpawnInterval) {
      this.spawnItem();
      this.lastItemSpawn = currentTime;
    }
    
    // 更新物品位置（时间停止时也继续移动）
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      
      // 物品正常移动（时间停止时不停止）
      item.y += item.speed;
      
      // 磁铁效果：吸引物品（时间停止时也生效）
      if (this.magnetActive) {
        const basketCenterX = this.basket.x + this.basket.width / 2;
        const basketCenterY = this.basket.y + this.basket.height / 2;
        const dx = basketCenterX - item.x;
        const dy = basketCenterY - item.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          item.x += dx * 0.05;
          item.y += dy * 0.02;
        }
      }
      
      // 检查碰撞（时间停止时也可以碰撞）
      if (this.checkCollision(item)) {
        this.handleItemCollision(item);
        this.items.splice(i, 1);
        continue;
      }
      
      // 移除超出画布的物品
      if (item.y > this.height + item.radius) {
        this.items.splice(i, 1);
      }
    }
    
    this.updateUI();
  }
  
  // 碰撞检测
  private checkCollision(item: FallingItem): boolean {
    // 简化为矩形碰撞检测
    const itemLeft = item.x - item.radius;
    const itemRight = item.x + item.radius;
    const itemTop = item.y - item.radius;
    const itemBottom = item.y + item.radius;
    
    const basketLeft = this.basket.x;
    const basketRight = this.basket.x + this.basket.width;
    const basketTop = this.basket.y;
    const basketBottom = this.basket.y + this.basket.height;
    
    return !(itemRight < basketLeft || 
             itemLeft > basketRight || 
             itemBottom < basketTop || 
             itemTop > basketBottom);
  }
  
  // 处理物品碰撞
  private handleItemCollision(item: FallingItem): void {
    switch (item.type) {
      case 'gold':
        this.handleScore(10);
        this.combo++;
        break;
      case 'diamond':
        this.handleScore(30);
        this.combo++;
        break;
      case 'bomb':
        this.combo = 0;
        if (this.score >= 20) {
          this.score -= 20;
        } else {
          this.lives--;
        }
        break;
      case 'magnet':
        this.magnetActive = true;
        this.magnetEndTime = performance.now() + 5000;
        break;
      case 'timeStop':
        this.timeStopActive = true;
        this.timeStopEndTime = performance.now() + 3000;
        break;
    }
  }
  
  // 处理得分（包括连击系统）
  private handleScore(basePoints: number): void {
    let points = basePoints;
    
    // 连击系统：连续接住5个非炸弹物品后，下一个奖励分数翻倍
    if (this.combo >= 5) {
      points *= 2;
      this.combo = 0;
    }
    
    this.score += points;
  }
  
  // 绘制游戏
  private draw(): void {
    // 清除画布
    this.ctx.fillStyle = themes[this.currentTheme].background;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // 绘制地面
    this.ctx.fillStyle = themes[this.currentTheme].ground;
    this.ctx.fillRect(0, this.height - 20, this.width, 20);
    
    // 绘制篮子
    this.drawBasket();
    
    // 绘制物品
    for (const item of this.items) {
      this.drawItem(item);
    }
    
    // 绘制时间停止效果
    if (this.timeStopActive) {
      this.ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.fillStyle = 'white';
      this.ctx.font = '30px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('时间停止中...', this.width / 2, this.height / 2);
    }
    
    // 绘制磁铁效果范围
    if (this.magnetActive) {
      this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      const basketCenterX = this.basket.x + this.basket.width / 2;
      const basketCenterY = this.basket.y + this.basket.height / 2;
      this.ctx.arc(basketCenterX, basketCenterY, 200, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }
  
  // 绘制篮子
  private drawBasket(): void {
    this.ctx.fillStyle = themes[this.currentTheme].basket;
    this.ctx.fillRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height);
    
    this.ctx.strokeStyle = themes[this.currentTheme].basketBorder;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(this.basket.x, this.basket.y, this.basket.width, this.basket.height);
    
    // 篮子装饰
    this.ctx.strokeStyle = themes[this.currentTheme].basketBorder;
    this.ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      const y = this.basket.y + (this.basket.height / 3) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(this.basket.x, y);
      this.ctx.lineTo(this.basket.x + this.basket.width, y);
      this.ctx.stroke();
    }
  }
  
  // 绘制物品
  private drawItem(item: FallingItem): void {
    switch (item.type) {
      case 'gold':
        this.drawGold(item);
        break;
      case 'diamond':
        this.drawDiamond(item);
        break;
      case 'bomb':
        this.drawBomb(item);
        break;
      case 'magnet':
        this.drawMagnet(item);
        break;
      case 'timeStop':
        this.drawTimeStop(item);
        break;
    }
  }
  
  // 绘制金币
  private drawGold(item: FallingItem): void {
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#B8860B';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 金币符号
    this.ctx.fillStyle = '#B8860B';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('$', item.x, item.y);
  }
  
  // 绘制钻石
  private drawDiamond(item: FallingItem): void {
    this.ctx.fillStyle = '#00BFFF';
    this.ctx.beginPath();
    this.ctx.moveTo(item.x, item.y - item.radius);
    this.ctx.lineTo(item.x + item.radius, item.y);
    this.ctx.lineTo(item.x, item.y + item.radius);
    this.ctx.lineTo(item.x - item.radius, item.y);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#0080FF';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 内部装饰
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.beginPath();
    this.ctx.moveTo(item.x, item.y - item.radius * 0.5);
    this.ctx.lineTo(item.x + item.radius * 0.5, item.y);
    this.ctx.lineTo(item.x, item.y + item.radius * 0.5);
    this.ctx.lineTo(item.x - item.radius * 0.5, item.y);
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  // 绘制炸弹
  private drawBomb(item: FallingItem): void {
    this.ctx.fillStyle = '#333333';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 引信
    this.ctx.strokeStyle = '#8B4513';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(item.x, item.y - item.radius);
    this.ctx.quadraticCurveTo(item.x + 5, item.y - item.radius - 10, item.x, item.y - item.radius - 15);
    this.ctx.stroke();
    
    // 火花
    this.ctx.fillStyle = '#FF4500';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y - item.radius - 15, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y - item.radius - 15, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 高光
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(item.x - 5, item.y - 5, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  // 绘制磁铁道具
  private drawMagnet(item: FallingItem): void {
    // 磁铁主体
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(item.x - item.radius, item.y - item.radius * 0.5, item.radius * 0.6, item.radius);
    
    this.ctx.fillStyle = '#0000FF';
    this.ctx.fillRect(item.x + item.radius * 0.4, item.y - item.radius * 0.5, item.radius * 0.6, item.radius);
    
    // 中间连接部分
    this.ctx.fillStyle = '#808080';
    this.ctx.fillRect(item.x - item.radius * 0.4, item.y - item.radius * 0.3, item.radius * 0.8, item.radius * 0.6);
    
    // 边框
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(item.x - item.radius, item.y - item.radius * 0.5, item.radius * 2, item.radius);
  }
  
  // 绘制时间停止道具
  private drawTimeStop(item: FallingItem): void {
    // 圆形背景
    this.ctx.fillStyle = '#9370DB';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 边框
    this.ctx.strokeStyle = '#4B0082';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 时钟图案
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y, item.radius * 0.7, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 时钟指针
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    
    // 时针
    this.ctx.beginPath();
    this.ctx.moveTo(item.x, item.y);
    this.ctx.lineTo(item.x, item.y - item.radius * 0.4);
    this.ctx.stroke();
    
    // 分针
    this.ctx.beginPath();
    this.ctx.moveTo(item.x, item.y);
    this.ctx.lineTo(item.x + item.radius * 0.3, item.y + item.radius * 0.2);
    this.ctx.stroke();
    
    // 中心点
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(item.x, item.y, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  // 游戏循环
  private gameLoop(currentTime: number): void {
    this.update(currentTime);
    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
  new GoldCatcherGame();
});
