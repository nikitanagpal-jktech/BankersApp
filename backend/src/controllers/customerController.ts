import { Response } from 'express';
import { eq, desc, or, ilike, sql } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { AuthenticatedBankerRequest } from '../middleware/bankerAuth';

/**
 * Get a paginated list of registered customers for the banker's branch directory (10 per page)
 */
export async function getAllCustomers(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const bankerBranchId = req.banker!.branch_id;
    const page = Number(req.query.page) || 1;
    const limit = 10; // Strict limit: 10 per page for performance
    const offset = (page - 1) * limit;

    const customers = await db
      .selectDistinct({
        customer_id: schema.customers.customer_id,
        first_name: schema.customers.first_name,
        last_name: schema.customers.last_name,
        primary_mobile: schema.customers.primary_mobile,
        email: schema.customers.email,
        city: schema.customers.city,
        state: schema.customers.state,
        created_at: schema.customers.created_at,
      })
      .from(schema.customers)
      .innerJoin(schema.accounts, eq(schema.customers.customer_id, schema.accounts.customer_id))
      .where(eq(schema.accounts.branch_id, bankerBranchId))
      .orderBy(desc(schema.customers.created_at))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(DISTINCT ${schema.customers.customer_id})` })
      .from(schema.customers)
      .innerJoin(schema.accounts, eq(schema.customers.customer_id, schema.accounts.customer_id))
      .where(eq(schema.accounts.branch_id, bankerBranchId));

    return res.json({
      success: true,
      customers,
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit),
        totalItems: Number(totalResult.count),
      },
    });
  } catch (error: any) {
    console.error('Fetch branch customers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch branch customers.' });
  }
}

/**
 * Get full customer profile along with all linked bank accounts
 */
export async function getCustomers(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { customerId } = req.params;

    if (!customerId || !customerId.trim()) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }

    const [customer] = await db
      .select({
        customer_id: schema.customers.customer_id,
        first_name: schema.customers.first_name,
        last_name: schema.customers.last_name,
        dob: schema.customers.dob,
        gender: schema.customers.gender,
        marital_status: schema.customers.marital_status,
        primary_mobile: schema.customers.primary_mobile,
        secondary_phone: schema.customers.secondary_phone,
        email: schema.customers.email,
        pan: schema.customers.pan,
        address_line1: schema.customers.address_line1,
        address_line2: schema.customers.address_line2,
        city: schema.customers.city,
        state: schema.customers.state,
        postal_code: schema.customers.postal_code,
        country: schema.customers.country,
        created_at: schema.customers.created_at,
        updated_at: schema.customers.updated_at,
      })
      .from(schema.customers)
      .where(eq(schema.customers.customer_id, customerId.trim()));

    if (!customer) {
      return res.status(404).json({ error: 'Customer CIF not found in branch records.' });
    }

    const accounts = await db
      .select({
        account_number: schema.accounts.account_number,
        account_type: schema.accounts.account_type,
        balance: schema.accounts.balance,
        status: schema.accounts.status,
        created_at: schema.accounts.created_at,
        branch_id: schema.accounts.branch_id,
        branch_name: schema.branches.branch_name,
        ifsc_code: schema.branches.ifsc_code,
      })
      .from(schema.accounts)
      .innerJoin(schema.branches, eq(schema.accounts.branch_id, schema.branches.branch_id))
      .where(eq(schema.accounts.customer_id, customer.customer_id))
      .orderBy(desc(schema.accounts.created_at));

    return res.json({
      message: 'Customer profile and accounts retrieved successfully.',
      customer,
      accounts,
    });
  } catch (error: any) {
    console.error('Fetch customer details error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error while fetching customer details.' });
  }
}

/**
 * Find a customer and their primary account details by either CIF or Account Number
 */
export async function getCustomerByIdOrAccount(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { identifier } = req.params;
    const query = identifier?.trim();

    if (!query) {
      return res.status(400).json({ error: 'Search identifier is required.' });
    }

    let customerRecord = null;
    let accountRecord = null;

    const [foundAccount] = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.account_number, query));

    if (foundAccount) {
      accountRecord = foundAccount;
      const [foundCust] = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.customer_id, foundAccount.customer_id));
      customerRecord = foundCust;
    } else {
      const [foundCust] = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.customer_id, query));

      if (foundCust) {
        customerRecord = foundCust;
        const [acc] = await db
          .select()
          .from(schema.accounts)
          .where(eq(schema.accounts.customer_id, foundCust.customer_id))
          .limit(1);
        accountRecord = acc;
      }
    }

    if (!customerRecord) {
      return res.status(404).json({ error: 'Customer or Account not found in branch records.' });
    }

    let branchInfo = null;
    if (accountRecord) {
      const [branch] = await db
        .select()
        .from(schema.branches)
        .where(eq(schema.branches.branch_id, accountRecord.branch_id));
      branchInfo = branch;
    }

    return res.json({
      success: true,
      customer: customerRecord,
      account: {
        account_number: accountRecord?.account_number || 'N/A',
        account_type: accountRecord?.account_type || 'SAVINGS',
        created_at: accountRecord?.created_at || customerRecord.created_at,
        branch: branchInfo || { branch_name: 'Nidhi Bank Branch', ifsc_code: 'NIDH0001' },
      },
    });
  } catch (error: any) {
    console.error('Customer lookup error:', error);
    return res.status(500).json({ error: error.message || 'Failed to lookup customer details.' });
  }
}

/**
 * Update Customer KYC / Contact Details
 */
export async function updateCustomer(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const { customerId } = req.params;
    const {
      first_name,
      last_name,
      dob,
      gender,
      marital_status,
      primary_mobile,
      secondary_phone,
      email,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
    } = req.body;

    if (!customerId || !customerId.trim()) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }

    const [existing] = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.customer_id, customerId.trim()));

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const [updatedCustomer] = await db
      .update(schema.customers)
      .set({
        first_name: first_name !== undefined ? first_name.trim() : existing.first_name,
        last_name: last_name !== undefined ? last_name.trim() : existing.last_name,
        dob: dob || existing.dob,
        gender: gender || existing.gender,
        marital_status: marital_status || existing.marital_status,
        primary_mobile: primary_mobile !== undefined ? primary_mobile.trim() : existing.primary_mobile,
        secondary_phone: secondary_phone?.trim() ? secondary_phone.trim() : null,
        email: email?.trim() ? email.trim() : null,
        address_line1: address_line1 !== undefined ? address_line1.trim() : existing.address_line1,
        address_line2: address_line2?.trim() ? address_line2.trim() : null,
        city: city !== undefined ? city.trim() : existing.city,
        state: state !== undefined ? state.trim() : existing.state,
        postal_code: postal_code !== undefined ? postal_code.trim() : existing.postal_code,
        country: country || existing.country || 'India',
        updated_at: new Date(),
      })
      .where(eq(schema.customers.customer_id, customerId.trim()))
      .returning();

    return res.json({
      message: 'Customer details updated successfully.',
      customer: updatedCustomer,
    });
  } catch (error: any) {
    console.error('Update customer error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update customer details.' });
  }
}

/**
 * Search customers across CIF, Name, PAN, or Mobile (10 per page)
 */
export async function searchCustomers(req: AuthenticatedBankerRequest, res: Response) {
  try {
    const query = String(req.query.q || '').trim();
    const page = Number(req.query.page) || 1;
    const limit = 10; // Strict limit: 10 per page
    const offset = (page - 1) * limit;

    if (!query) {
      return res.status(400).json({ error: 'Query string parameter q is required.' });
    }

    const matchedCustomers = await db
      .select({
        customer_id: schema.customers.customer_id,
        first_name: schema.customers.first_name,
        last_name: schema.customers.last_name,
        primary_mobile: schema.customers.primary_mobile,
        pan: schema.customers.pan,
        city: schema.customers.city,
      })
      .from(schema.customers)
      .where(
        or(
          ilike(schema.customers.customer_id, `%${query}%`),
          ilike(schema.customers.first_name, `%${query}%`),
          ilike(schema.customers.last_name, `%${query}%`),
          ilike(schema.customers.primary_mobile, `%${query}%`),
          ilike(schema.customers.pan, `%${query}%`)
        )
      )
      .limit(limit)
      .offset(offset);

    // Get total count matching query for frontend pagination controls
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.customers)
      .where(
        or(
          ilike(schema.customers.customer_id, `%${query}%`),
          ilike(schema.customers.first_name, `%${query}%`),
          ilike(schema.customers.last_name, `%${query}%`),
          ilike(schema.customers.primary_mobile, `%${query}%`),
          ilike(schema.customers.pan, `%${query}%`)
        )
      );

    return res.json({ 
      customers: matchedCustomers, 
      pagination: {
        currentPage: page,
        perPage: limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit),
        totalItems: Number(totalResult.count),
      }
    });
  } catch (error: any) {
    console.error('Search customers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to search customers.' });
  }
}