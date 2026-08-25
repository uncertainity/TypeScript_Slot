
#include <iostream>
#include <random>

using namespace std;

struct statistics {
	uint64_t triggers_red = 0;
	uint64_t triggers_white = 0;
	uint64_t triggers_blue = 0;
	uint64_t triggers_red_white = 0;
	uint64_t triggers_white_blue = 0;
	uint64_t triggers_red_blue = 0;
	uint64_t triggers_red_white_blue = 0;

	uint64_t win_red = 0;
	uint64_t win_white = 0;
	uint64_t win_blue = 0;
	uint64_t win_red_white = 0;
	uint64_t win_white_blue = 0;
	uint64_t win_red_blue = 0;
	uint64_t win_red_white_blue = 0;

	uint64_t number_of_symbols = 0;
};


//Randoms
mt19937_64 rng;

struct str_state {
    int initial_coins = 0;

    int initial_red_stars = 0; 
	int initial_white_stars = 0;
	int initial_blue_stars = 0;

    int new_red_stars = 0;
	int new_white_stars = 0;
	int new_blue_stars = 0;

    int new_coins = 0;
    int new_stars = 0;

    int coins_in_view = 0;
    int remaining_spins = 3;
    int n_symbols_in_view = 0;
    int add_prob = 0;

    bool is_star_allowed = true;
    bool is_red_star_allowed = true;
	bool is_white_star_allowed = true;
	bool is_blue_star_allowed = true;

    int coins_to_add = 0;


    int cells[15] = { -1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1 };
    int values[15] = { 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 };

};

struct str_constraints {

    int max_win_to_allow_stars = 0;
    int max_boost_in_session = 0;
    int max_collects_in_session = 0;
    int max_multipliers_in_session = 0;
    int min_new_coins = 0;
    int min_new_stars = 0;
} constraints;

struct table_weights {
	vector<int> values;
	vector<int> weights;
};

enum colors{R,W,B,RW,RB,WB,RWB};

//========================================================
// Tables for base game
//========================================================
table_weights star_color{
	{ 1,2,3},
	{ 1,1,1}
};
table_weights trigger_red{
	{0,1},
	{260,5} 
};
table_weights trigger_white{
	{0,2},
	{260,5} 
};
table_weights trigger_blue{
	{0,3},
	{260,5} 
};
table_weights trigger_red_white{
	{0,1,2,12},
	{180,8,8,12}
};
table_weights trigger_red_blue{
		{0,1,3,13},
		{180,9,9,15}
};
table_weights trigger_white_blue{
	{0,2,3,23},
	{ 110,9,9,13 }
};
table_weights trigger_red_white_blue{
	{0,1,2,3,12,13,23,123},
	{225,15,15,15,30,30,30,75}
};


//========================================================
// Tables for bonus game (Regular, not Special session)
//========================================================

table_weights max_win_to_allow_stars = {
	{ 150,250},
	{ 100, 25}
};
table_weights max_multiplier_in_session = {
	{1,2,3},
	{7,7,1}
};
table_weights max_collectors_in_session = {
	{1,2,3},
	{50,20,5}
};
table_weights max_boost_in_session = {
	{8,10},
	{100,50}
};
table_weights min_new_coins = {
	{1,2},
	{10,10}
};
table_weights min_new_stars = {
	{0,1},
	{70,30}
};
table_weights coin_kind = {
	{0,1,2,3},
	{16,3,3,10}
};
table_weights multiplier = {
	{2,3,4},
	{200,100,40}
};
table_weights coin_values_initial = {
	{1,2,3,4,5,10,15,20,25,50,100},
	{4200,4500,2000,700,500,150,0,0,0,0,0}
};
table_weights coin_values = {
	{1,2,3,4,5,10,15,20,25,50,100},
	{4902,4500,2000,500,300,100,70,50,30,10,0}
};
table_weights initial_coins_amount = {
	{1,2,3},
	{1,1,1}
};


int random(table_weights table);
int random(unsigned n);


void setup_constraints(int n_red, int n_white, int n_blue);
void set_initial_screen(str_state& state);
unsigned long long get_total_win(str_state state);

void apply_multipliers(str_state& state);
void apply_collectors(str_state& state);
void apply_booster(str_state& state);
void add_coins(str_state& state);

void check_constraints(str_state& state, str_constraints constraints);

unsigned long long play_respins(int n_red, int n_white, int n_blue);

int main()
{
    rng.seed(123456);
	unsigned long long total_payout = 0;
	unsigned long long plays = 0;

	statistics stats;

	for (unsigned long long iter = 0; iter < 10000000000; iter++)
	{
		//Start play iteration...
		if (iter && !(iter % 1000000))
		{
			system("CLS");
			cout << "Games: " << iter << endl;
			cout << "Avg pay: " << 1.0 * total_payout / plays << endl;
			cout << "================================================\n";

			cout << "Frequencies: " << endl;
			cout<<  "Red: " << plays *1.0/stats.triggers_red<< endl;
			cout << "White: " << plays * 1.0 / stats.triggers_white << endl;
			cout << "Blue: " << plays * 1.0 / stats.triggers_blue << endl;
			cout << "Red-White: " << plays * 1.0 / stats.triggers_red_white << endl;
			cout << "Red-Blue: " << plays * 1.0 / stats.triggers_red_blue << endl;
			cout << "White-Blue: " << plays * 1.0 / stats.triggers_white_blue << endl;
			cout << "Red-White-Blue: " << plays * 1.0 / stats.triggers_red_white_blue << endl;

			cout << "================================================\n";

			cout << "RTP: " << endl;
			cout << "Red: " << stats.win_red  *1.0 / plays  << endl;
			cout << "White: " << stats.win_white * 1.0 / plays << endl;
			cout << "Blue: " << stats.win_blue  *1.0 / plays << endl;
			cout << "Red-White: " << stats.win_red_white * 1.0 / plays  << endl;
			cout << "Red-Blue: " << stats.win_red_blue  * 1.0 / plays<< endl;
			cout << "White-Blue: " << stats.win_white_blue * 1.0 / plays << endl;
			cout << "Red-White-Blue: " << stats.win_red_white_blue * 1.0 / plays << endl;
			cout << "================================================\n";

		}

//========================================================
// Set the number of scatters/stars in the base game...
//========================================================
		int n_scatters = 3;
		int n_colors[4] = { 0,0,0,0 }; //0 is not used, 1: red, 2: white, 3: blue

		//Assign a color for each star (scatters)
		for (int i = 0; i < n_scatters; i++)
			n_colors[random(star_color)]++;

		colors colors_in_view;

		if ((n_colors[1] >  0) && (n_colors[2] == 0) && (n_colors[3] == 0)) colors_in_view = R;
		if ((n_colors[1] == 0) && (n_colors[2] >  0) && (n_colors[3] == 0)) colors_in_view = W;
		if ((n_colors[1] == 0) && (n_colors[2] == 0) && (n_colors[3] >  0)) colors_in_view = B;
		if ((n_colors[1] >  0) && (n_colors[2] >  0) && (n_colors[3] == 0)) colors_in_view = RW;
		if ((n_colors[1] >  0) && (n_colors[2] == 0) && (n_colors[3] >  0)) colors_in_view = RB;
		if ((n_colors[1] == 0) && (n_colors[2] >  0) && (n_colors[3] >  0)) colors_in_view = WB;
		if ((n_colors[1] >  0) && (n_colors[2] >  0) && (n_colors[3] >  0)) colors_in_view = RWB;

		int trigger;
		switch (colors_in_view)
		{
		case R: trigger = random(trigger_red); break;
		case W: trigger = random(trigger_white); break;
		case B: trigger = random(trigger_blue); break;
		case RW: trigger = random(trigger_red_white); break;
		case RB: trigger = random(trigger_red_blue); break;
		case WB: trigger = random(trigger_white_blue); break;
		case RWB: trigger = random(trigger_red_white_blue); break;
		default: break;
		}

		//Remove the stars which do not trigger the bonus
		if (trigger == 1)
		{
			n_colors[2] = 0;
			n_colors[3] = 0;
		}
		if (trigger == 2)
		{
			n_colors[1] = 0;
			n_colors[3] = 0;
		}
		if (trigger == 3)
		{
			n_colors[1] = 0;
			n_colors[2] = 0;
		}
		if (trigger == 12)
		{
			n_colors[3] = 0;
		}
		if (trigger == 13)
		{
			n_colors[2] = 0;
		}
		if (trigger == 23)
		{
			n_colors[1] = 0;
		}


		if (trigger)
		{
			unsigned long long respins_win = play_respins(n_colors[1], n_colors[2], n_colors[3]);
			total_payout += respins_win;

			//Stats
			if (trigger == 1)
			{
				stats.win_red += respins_win;
				stats.triggers_red++;
			}
			if (trigger == 2)
			{
				stats.win_white += respins_win;
				stats.triggers_white++;
			}
			if (trigger == 3)
			{
				stats.win_blue += respins_win;
				stats.triggers_blue++;
			}
			if (trigger == 12)
			{
				stats.win_red_white += respins_win;
				stats.triggers_red_white++;
			}
			if (trigger == 13)
			{
				stats.win_red_blue += respins_win;
				stats.triggers_red_blue++;
			}
			if (trigger == 23)
			{
				stats.win_white_blue += respins_win;
				stats.triggers_white_blue++;
			}
			if (trigger == 123)
			{
				stats.win_red_white_blue += respins_win;
				stats.triggers_red_white_blue++;
			}
		}
		plays++;

	}

    system("PAUSE");
}



int random(table_weights table)
{
	int res = 0;

	//Check x and weights have same length
	if (table.values.size() == table.weights.size())
	{
		int acum = 0;
		int length = static_cast<int>(table.values.size());
		for (int i = 0; i < length; i++) {
			acum += table.weights[i];
		}
		uniform_int_distribution<int> ui(0, acum - 1);

		int r = ui(rng);
		int v = 0;
		for (int j = 0; j < length; j++) {
			if (v <= r && r < v + (int)table.weights[j]) {
				res = table.values[j];
				break;
			}
			v = v + table.weights[j];
		}
	}
	else {
		printf("Error: x and weights have different lenghts");
	}

	return res;
}

int random(unsigned n)
{
	uniform_int_distribution<int> ui(0, n - 1);
	return (int)ui(rng);
}

void setup_constraints(int n_red, int n_white, int n_blue)
{
	coin_kind.weights = { 16, 3, 3, 10 };

	if (n_red == 0)
		coin_kind.weights[1] = 0;
	if (n_white == 0)
		coin_kind.weights[2] = 0;
	if (n_blue == 0)
		coin_kind.weights[3] = 0;


	constraints.max_win_to_allow_stars = random(max_win_to_allow_stars);
	constraints.max_multipliers_in_session = random(max_multiplier_in_session);
	constraints.max_collects_in_session = random(max_collectors_in_session);
	constraints.max_boost_in_session = random(max_boost_in_session);

	constraints.min_new_coins = random(min_new_coins);
	constraints.min_new_stars = random(min_new_stars);
}

void set_initial_screen(str_state& state)
{
	state.initial_coins = random(initial_coins_amount);

	//Add triggering RED stars
	int red_stars = state.initial_red_stars;
	while (red_stars--)
	{
		state.cells[state.n_symbols_in_view] = 1;//ID 1 is RED star

		state.coins_in_view++;
		state.n_symbols_in_view++;
	}
	int white_stars = state.initial_white_stars;
	while (white_stars--)
	{
		state.cells[state.n_symbols_in_view] = 2;//ID 2 is WHITE star

		state.coins_in_view++;
		state.n_symbols_in_view++;
	}
	int blue_stars = state.initial_blue_stars;
	while (blue_stars--)
	{
		state.cells[state.n_symbols_in_view] = 3;//ID 3 is BLUE star

		state.coins_in_view++;
		state.n_symbols_in_view++;
	}

	//Add initial coins
	int coins = state.initial_coins;
	while (coins--)
	{
		state.cells[state.n_symbols_in_view] = 0; //ID 0 is coin
		state.values[state.n_symbols_in_view] = random(coin_values_initial);

		state.coins_in_view++;
		state.n_symbols_in_view++;
	}
}

unsigned long long get_total_win(str_state state)
{
	unsigned total_win = 0;

	for (int i = 0; i < state.n_symbols_in_view; i++)
		total_win += state.values[i];

	return total_win;
}

void apply_multipliers(str_state& state)
{
	for (int i = 0; i < state.n_symbols_in_view; i++)
	{
		if (state.cells[i] == 1 && state.values[i] == 0) //If it is a RED star that hasn't been used yet...
		{
			int mult = random(multiplier);
			//Iterate through the entire values multiplying...
			for (int j = 0; j < state.n_symbols_in_view; j++)
				state.values[j] *= mult;

			//Assign a value
			state.values[i] = random(coin_values);
		}
	}
}

void apply_collectors(str_state& state)
{
	for (int i = 0; i < state.n_symbols_in_view; i++)
	{
		if (state.cells[i] == 2 && state.values[i] == 0) //If it is a WHITE star that hasn't been used yet...
		{
			//Iterate through the entire values multiplying...
			for (int j = 0; j < state.n_symbols_in_view; j++)
				if (i != j) state.values[i] += state.values[j];
		}
	}
}

void apply_booster(str_state& state)
{
	int values_list[11] = { 1,2,3,4,5,10,15,20,25,50,100 };

	for (int i = 0; i < state.n_symbols_in_view; i++)
	{
		if (state.cells[i] == 3 && state.values[i] == 0) //If it is a BLUE star that hasn't been used yet...
		{
			//Iterate through the entire values boosting...
			for (int j = 0; j < state.n_symbols_in_view; j++)
			{
				if (state.values[j] > 0 && state.values[j] < 100) //values greater than 100x are not boosted...
				{
					int current = state.values[j];

					// look for the "next" value
					for (int k = 0; k < 11; k++)
					{
						if (values_list[k] > current)
						{
							state.values[j] = values_list[k];
							break;
						}
					}
				}
			}

			//Assign a value
			state.values[i] = random(coin_values);

		}
	}
}

void add_coins(str_state& state)
{
	while (state.coins_to_add)
	{
		state.remaining_spins = 3;
		state.coins_to_add--;
		int kind = random(coin_kind); //Weights in coin_kind are updated when a star is no longer allowed

		state.cells[state.n_symbols_in_view] = kind;

		switch (kind)
		{
		case 0: //Coin
			state.values[state.n_symbols_in_view] = random(coin_values);
			break;
		case 1: //Red star
			state.new_stars++;
			state.new_red_stars++;
			break;
		case 2: //White star
			state.new_stars++;
			state.new_white_stars++;
			break;
		case 3: //Blue star
			state.new_stars++;
			state.new_blue_stars++;
			break;
		default:
			break;
		}

		state.coins_in_view++; 
		state.n_symbols_in_view++;
		state.new_coins++; 

		//Update contraints...
		//Red star constraint
		if (state.new_red_stars >= constraints.max_multipliers_in_session)
		{
			state.is_red_star_allowed = false;
			coin_kind.weights[1] = 0;
		}
		//White star constraint
		if (state.new_white_stars >= constraints.max_collects_in_session)
		{
			state.is_white_star_allowed = false;
			coin_kind.weights[2] = 0;
		}
		//Blue star constraint
		if (state.new_blue_stars >= constraints.max_boost_in_session)
		{
			state.is_blue_star_allowed = false;
			coin_kind.weights[3] = 0;
		}

		if (!state.is_red_star_allowed && !state.is_white_star_allowed && !state.is_blue_star_allowed)
			state.is_star_allowed = false;
	}
}

void check_constraints(str_state& state, str_constraints constraints)
{
	//Min Coins
	if (state.new_coins < constraints.min_new_coins && state.n_symbols_in_view < 14)
	{
		//Add new symbol
		state.remaining_spins = 3;

		state.cells[state.n_symbols_in_view] = 0; //add coin (not a star)
		state.values[state.n_symbols_in_view] = random(coin_values);

		state.coins_in_view++;
		state.n_symbols_in_view++;
		state.new_coins++;

		return;
	}

	//Min new stars 
	if (state.is_star_allowed &&
		state.new_stars < constraints.min_new_stars &&
		state.n_symbols_in_view < 14 &&
		get_total_win(state) <= constraints.max_win_to_allow_stars)
	{
		//Add star
		state.remaining_spins = 3;

		int kind =  random(coin_kind);

		while(kind == 0) //This is equivalent to set the weight in 0 for kind = 0 keeping the rest of the weights as they are
			kind = random(coin_kind);

		state.cells[state.n_symbols_in_view] = kind;

		state.coins_in_view++;
		state.n_symbols_in_view++;
		state.new_stars++;
		state.new_coins++;

		if (kind == 1)
			state.new_red_stars++;
		if (kind == 2)
			state.new_white_stars++;
		if (kind == 3)
			state.new_blue_stars++;

		//Update
		//Red star constraint
		if (state.new_red_stars >= constraints.max_multipliers_in_session)
		{
			state.is_red_star_allowed = false;
			coin_kind.weights[1] = 0;
		}
		//White star constraint
		if (state.new_white_stars >= constraints.max_collects_in_session)
		{
			state.is_white_star_allowed = false;
			coin_kind.weights[2] = 0;
		}
		//Blue star constraint
		if (state.new_blue_stars >= constraints.max_boost_in_session)
		{
			state.is_blue_star_allowed = false;
			coin_kind.weights[3] = 0;
		}

		return;
	}


}

unsigned long long play_respins(int n_red, int n_white, int n_blue)
{
	str_state state;

	state.initial_red_stars = n_red;
	state.initial_white_stars = n_white;
	state.initial_blue_stars = n_blue;

	if (n_red == 0) state.is_red_star_allowed = false;
	if (n_white == 0) state.is_white_star_allowed = false;
	if (n_blue == 0) state.is_blue_star_allowed = false;


	setup_constraints(n_red,n_white,n_blue);
	set_initial_screen(state);

	apply_booster(state);
	apply_multipliers(state);
	apply_collectors(state);
	

	int probabilities[15] = { 0,0,7,6,6,5,4,4,3,2,2,1,1,1,1 };

	while (state.remaining_spins)
	{
		state.remaining_spins--;
		state.add_prob = probabilities[state.n_symbols_in_view];

		//If the max win to allow stars was reached then no more stars are allowed...
		if (get_total_win(state) >= constraints.max_win_to_allow_stars)
		{
			state.is_star_allowed = false;
			state.is_red_star_allowed = false;
			state.is_white_star_allowed = false;
			state.is_blue_star_allowed = false;

			coin_kind.weights[1] = 0;
			coin_kind.weights[2] = 0;
			coin_kind.weights[3] = 0;
		}


		//Go through the empty cells to see if a symbol is added or not...
		for (int cell = state.n_symbols_in_view; cell < 15; cell++)
		{
			if (random(100) < state.add_prob)
				state.coins_to_add++;
		}

		add_coins(state);

		//Check if a symbol needs to be added ("forced")
		if (state.remaining_spins == 0)
			check_constraints(state, constraints);

		apply_booster(state);
		apply_multipliers(state);
		apply_collectors(state);
	}


	return get_total_win(state);
}

