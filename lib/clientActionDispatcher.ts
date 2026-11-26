import axiosClient from './axiosClient';

export interface ActionResult {
  type: string;
  id?: string;
  name?: string;
  amount?: number;
  hp?: number;
  exp?: number;
  rewardExp?: number;
  [key: string]: any;
}

export async function executeActionViaStandardApi(action: any): Promise<ActionResult> {
  const actionType = action.actionType;

  switch (actionType) {
    case 'meal': {
      const payload: any = {
        food_name: action.food_name || action.description || 'Món ăn',
        consumed_at: action.custom_time || undefined,
        source: action.source || (action.ingredients_used?.length ? 'home' : 'eat_out'),
        cost: Math.max(0, Math.round(Number(action.amount) || 0)),
        wallet_id: action.wallet_id || undefined,
        ingredients_used: action.ingredients_used,
        calo: Number(action.calo) || 0,
        protein: Number(action.protein) || 0,
        fat: Number(action.fat) || 0,
        carb: Number(action.carb ?? action.carbs) || 0,
        meal_tier: action.meal_tier,
        ai_description: action.ai_description,
        image_url: action.image_url || action.imageUrl
      };
      const res = await axiosClient.post('/api/meals', payload);
      const meal = res.data?.mealLog;
      const hp = meal?.hp_restored || Math.floor((payload.calo || 200) * 1.0);
      return {
        type: 'meal',
        id: meal?._id,
        name: payload.food_name,
        hp,
        cost: payload.cost
      };
    }

    case 'delete_meal': {
      const mealId = action.meal_id || action.id;
      if (!mealId) throw new Error('Thiếu ID bữa ăn cần xóa');
      await axiosClient.delete(`/api/meals/${mealId}`);
      return { type: 'delete_meal', id: mealId };
    }

    case 'expense':
    case 'income': {
      const amount = Math.round(Number(action.amount) || 0);
      const res = await axiosClient.post('/api/finance/transactions', {
        type: actionType,
        amount,
        date: action.custom_time ? new Date(action.custom_time).toISOString() : new Date().toISOString(),
        description: action.description || action.name || (actionType === 'expense' ? 'Chi tiêu' : 'Thu nhập'),
        category: action.category || 'other',
        wallet_id: action.wallet_id
      });
      return {
        type: actionType,
        id: res.data?._id,
        amount,
        name: action.description || action.name
      };
    }

    case 'transfer': {
      const amount = Math.round(Number(action.amount) || 0);
      const fromWallet = action.wallet_id || action.from_wallet_id;
      const toWallet = action.to_wallet_id;
      const res = await axiosClient.post('/api/finance/transactions', {
        type: 'transfer',
        amount,
        date: action.custom_time ? new Date(action.custom_time).toISOString() : new Date().toISOString(),
        description: action.description || 'Chuyển tiền',
        wallet_id: fromWallet,
        to_wallet_id: toWallet
      });
      return {
        type: 'transfer',
        id: res.data?._id,
        amount
      };
    }

    case 'debt_lent':
    case 'debt_borrowed': {
      const type = actionType === 'debt_lent' ? 'lent' : 'borrowed';
      const amount = Math.round(Number(action.amount) || 0);
      const res = await axiosClient.post('/api/finance/debts', {
        personName: action.personName || action.name || 'Người quen',
        type,
        amount,
        dueDate: action.dueDate || action.custom_time,
        wallet_id: action.wallet_id
      });
      return {
        type: actionType,
        id: res.data?.debt?._id,
        amount,
        personName: action.personName || action.name
      };
    }

    case 'pay_debt': {
      const debtId = action.debt_id || action.id;
      if (!debtId) throw new Error('Thiếu ID khoản nợ');
      const amount = Math.round(Number(action.amount) || 0);
      await axiosClient.put(`/api/finance/debts/${debtId}`, {
        type: 'repay',
        amount,
        wallet_id: action.wallet_id
      });
      return {
        type: 'pay_debt',
        id: debtId,
        amount
      };
    }

    case 'borrow_more_debt': {
      const debtId = action.debt_id || action.id;
      if (!debtId) throw new Error('Thiếu ID khoản nợ');
      const amount = Math.round(Number(action.amount) || 0);
      const isLent = action.debt_type === 'lent';
      await axiosClient.put(`/api/finance/debts/${debtId}`, {
        type: isLent ? 'lend_more' : 'borrow_more',
        amount,
        wallet_id: action.wallet_id
      });
      return {
        type: 'borrow_more_debt',
        id: debtId,
        amount
      };
    }

    case 'upsert_budget': {
      const limit = Math.round(Number(action.limit) || Number(action.amount) || 0);
      const res = await axiosClient.post('/api/finance/budgets', {
        category: action.category,
        limit,
        name: action.name || action.category,
        month: action.month
      });
      return {
        type: 'upsert_budget',
        id: res.data?.budget?._id,
        category: action.category,
        limit
      };
    }

    case 'update_transaction': {
      const txId = action.transaction_id || action.id;
      if (!txId) throw new Error('Thiếu ID giao dịch');
      const updatePayload: any = {};
      if (action.amount !== undefined) updatePayload.amount = Math.round(Number(action.amount));
      if (action.description !== undefined) updatePayload.description = action.description;
      if (action.category !== undefined) updatePayload.category = action.category;
      if (action.wallet_id !== undefined) updatePayload.wallet_id = action.wallet_id;
      if (action.custom_time !== undefined) updatePayload.date = action.custom_time;
      await axiosClient.put(`/api/finance/transactions/${txId}`, updatePayload);
      return { type: 'update_transaction', id: txId };
    }

    case 'delete_transaction': {
      const txId = action.transaction_id || action.id;
      if (!txId) throw new Error('Thiếu ID giao dịch cần xóa');
      await axiosClient.delete(`/api/finance/transactions/${txId}`);
      return { type: 'delete_transaction', id: txId };
    }

    case 'create_task': {
      const res = await axiosClient.post('/api/tasks', {
        title: action.title || action.name,
        description: action.description || '',
        quest_rank: action.quest_rank || 'C',
        due_date: action.due_date || action.custom_time || new Date().toISOString()
      });
      const task = res.data?.task;
      return {
        type: 'create_task',
        id: task?._id,
        title: task?.title || action.title,
        rewardExp: action.exp_reward || 50
      };
    }

    case 'complete_task': {
      const taskId = action.task_id || action.id;
      if (!taskId) throw new Error('Thiếu ID nhiệm vụ');
      const res = await axiosClient.put(`/api/tasks/${taskId}`, { status: 'COMPLETED' });
      const exp = res.data?.reward?.exp ?? 50;
      return {
        type: 'complete_task',
        id: taskId,
        exp
      };
    }

    case 'update_task': {
      const taskId = action.task_id || action.id;
      if (!taskId) throw new Error('Thiếu ID nhiệm vụ');
      await axiosClient.put(`/api/tasks/${taskId}`, {
        title: action.title,
        description: action.description,
        quest_rank: action.quest_rank,
        due_date: action.due_date,
        status: action.status
      });
      return { type: 'update_task', id: taskId };
    }

    case 'delete_task': {
      const taskId = action.task_id || action.id;
      if (!taskId) throw new Error('Thiếu ID nhiệm vụ cần xóa');
      await axiosClient.delete(`/api/tasks/${taskId}`);
      return { type: 'delete_task', id: taskId };
    }

    case 'create_calendar_event': {
      const res = await axiosClient.post('/api/calendar', {
        title: action.title || action.name,
        description: action.description || '',
        start_time: action.start_time || action.custom_time,
        end_time: action.end_time,
        color_code: action.color_code || '#f97316',
        is_recurring: Boolean(action.is_recurring),
        recurrence_type: action.recurrence_type,
        recurrence_days: action.recurrence_days,
        recurrence_end: action.recurrence_end
      });
      return {
        type: 'create_calendar_event',
        id: res.data?.event?._id,
        title: action.title
      };
    }

    case 'update_calendar_event': {
      const eventId = action.event_id || action.id;
      if (!eventId) throw new Error('Thiếu ID lịch hẹn');
      await axiosClient.put(`/api/calendar/${eventId}`, {
        title: action.title,
        description: action.description,
        start_time: action.start_time,
        end_time: action.end_time,
        color_code: action.color_code,
        is_recurring: action.is_recurring,
        recurrence_type: action.recurrence_type,
        recurrence_days: action.recurrence_days,
        recurrence_end: action.recurrence_end
      });
      return { type: 'update_calendar_event', id: eventId };
    }

    case 'delete_calendar_event': {
      const eventId = action.event_id || action.id;
      if (!eventId) throw new Error('Thiếu ID lịch hẹn cần xóa');
      await axiosClient.delete(`/api/calendar/${eventId}`);
      return { type: 'delete_calendar_event', id: eventId };
    }

    case 'create_shopping_item': {
      const res = await axiosClient.post('/api/shopping', {
        name: action.name || action.food_name,
        quantity: Number(action.quantity) || 1,
        unit: action.unit || 'món',
        category: ['food', 'household', 'other'].includes(action.category) ? action.category : 'food'
      });
      return {
        type: 'create_shopping_item',
        id: res.data?.item?._id,
        name: action.name
      };
    }

    case 'purchase_shopping': {
      const addToInventory = action.add_to_inventory !== false;
      const amount = Math.max(0, Math.round(Number(action.amount) || 0));
      let itemId: string | undefined = undefined;

      if (addToInventory) {
        const invRes = await axiosClient.post('/api/finance/inventory', {
          name: action.name,
          category: action.inventory_category || 'food',
          quantity: Math.max(0.01, Number(action.quantity) || 1),
          unit: action.unit || 'món',
          totalValue: amount > 0 ? amount : undefined,
          wallet_id: amount > 0 ? action.wallet_id : undefined,
          purchaseDate: action.custom_time || undefined,
          expiryDate: action.expiryDate || undefined
        });
        itemId = invRes.data?.item?._id;
      } else if (amount > 0) {
        const txRes = await axiosClient.post('/api/finance/transactions', {
          type: 'expense',
          amount,
          date: action.custom_time ? new Date(action.custom_time).toISOString() : new Date().toISOString(),
          description: `Mua sắm: ${action.name}`,
          category: action.inventory_category === 'food' || action.inventory_category === 'spices' ? 'food' : 'shopping',
          wallet_id: action.wallet_id
        });
        itemId = txRes.data?._id;
      }

      if (action.shopping_item_id) {
        await axiosClient.put(`/api/shopping/${action.shopping_item_id}`, { checked: true });
      }

      return {
        type: 'purchase_shopping',
        id: itemId,
        name: action.name,
        amount
      };
    }

    case 'create_inventory': {
      const amount = Math.max(0, Math.round(Number(action.amount) || 0));
      const res = await axiosClient.post('/api/finance/inventory', {
        name: action.name,
        category: action.category || 'food',
        quantity: Math.max(0.01, Number(action.quantity) || 1),
        unit: action.unit || 'món',
        totalValue: amount > 0 ? amount : undefined,
        wallet_id: amount > 0 ? action.wallet_id : undefined,
        purchaseDate: action.purchaseDate || action.custom_time || undefined,
        expiryDate: action.expiryDate || undefined,
        isGift: Boolean(action.isGift)
      });
      return {
        type: 'create_inventory',
        id: res.data?.item?._id,
        name: action.name,
        amount
      };
    }

    case 'update_inventory': {
      const invId = action.inventory_id || action.inv_id || action.id;
      if (!invId) throw new Error('Thiếu ID món đồ kho');

      if (action.operation === 'discard' || action.operation === 'delete') {
        await axiosClient.delete(`/api/finance/inventory/${invId}`);
        return { type: 'update_inventory', id: invId, operation: 'discard' };
      } else {
        const updatePayload: any = {};
        if (action.name !== undefined) updatePayload.name = action.name;
        if (action.quantity !== undefined) updatePayload.quantity = Number(action.quantity);
        if (action.unit !== undefined) updatePayload.unit = action.unit;
        if (action.category !== undefined) updatePayload.category = action.category;
        if (action.expiryDate !== undefined) updatePayload.expiryDate = action.expiryDate;
        if (action.stock_status !== undefined) {
          updatePayload.stock_status = action.stock_status;
          updatePayload.justUpdateStockStatus = true;
        }
        await axiosClient.put(`/api/finance/inventory/${invId}`, updatePayload);
        return { type: 'update_inventory', id: invId };
      }
    }

    case 'record_weight': {
      await axiosClient.post('/api/health', {
        weight: action.weight,
        height: action.height,
        date: action.custom_time
      });
      return {
        type: 'record_weight',
        weight: action.weight,
        exp: 20
      };
    }

    case 'create_recipe': {
      const res = await axiosClient.post('/api/recipes', {
        name: action.name,
        ingredients: Array.isArray(action.ingredients) ? action.ingredients : [],
        instructions: action.instructions
      });
      return {
        type: 'create_recipe',
        id: res.data?.recipe?._id,
        name: action.name
      };
    }

    default:
      console.warn('Unknown action type for client dispatcher:', actionType);
      return { type: actionType, ...action };
  }
}

export async function executeActionsViaStandardApis(actions: any[]): Promise<{ success: boolean; message: string; results: ActionResult[] }> {
  if (!Array.isArray(actions) || actions.length === 0) {
    throw new Error('Danh sách hành động không hợp lệ');
  }

  const results: ActionResult[] = [];
  for (const action of actions) {
    const res = await executeActionViaStandardApi(action);
    results.push(res);
  }

  return {
    success: true,
    message: `Đã thực hiện thành công ${results.length} hành động!`,
    results
  };
}
