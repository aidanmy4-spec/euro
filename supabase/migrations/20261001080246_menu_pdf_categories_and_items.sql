/*
# Add the full dine-in menu from the supplied PDF

1. Menu categories
- Breakfast
- Pancakes & More
- Omelets
- Breakfast Sides
- Lunch
- Sandwiches
- Kids Menu
- Side Orders
- Beverages

2. Data changes
- Adds every item and listed price from the supplied dine-in menu PDF.
- Existing menu items are kept; matching category/name pairs are not duplicated when this migration is re-run.

3. Security
- Uses the existing public menu read policy and owner-only menu management policies.
*/

INSERT INTO public.menu_items (category, name, description, price, sort_order)
SELECT seed.category, seed.name, seed.description, seed.price, seed.sort_order
FROM (VALUES
  ('Breakfast', 'Pork Schnitzel Breakfast', 'Tenderized, lightly breaded pork loin fried golden brown, with homemade paprika sauce, two large eggs any style, homefries, and toast.', '$13.99', 1),
  ('Breakfast', 'Breakfast Tortilla Wrap', 'Scrambled eggs, cheddar cheese, choice of sausage, bacon, or ham, with homefries.', '$8.99', 2),
  ('Breakfast', 'Two Extra Large Eggs', 'Any style, served with homefries and toast.', '$5.99', 3),
  ('Breakfast', 'Two Extra Large Eggs with Meat', 'Any style, choice of ham, three strips of bacon, or three sausage links, homefries, and toast.', '$7.99', 4),
  ('Breakfast', 'Diced Ham, Sausage, or Bacon Scrambled', 'Served with homefries and toast.', '$7.99', 5),
  ('Pancakes & More', 'Chicken and Waffle', 'Chicken and waffle.', '$9.99', 10),
  ('Pancakes & More', 'Chicken and Waffle with Two Eggs', 'Chicken and waffle with two extra large eggs.', '$10.99', 11),
  ('Pancakes & More', 'Two Homemade Crepes', 'Choice of cheese, blueberry, strawberry, apple, or apricot, with powdered sugar and whipped cream.', '$7.99', 12),
  ('Pancakes & More', 'Belgian Waffle', 'Served with powdered sugar and whipped cream. Add strawberry, blueberry, apple, or chocolate topping for $1.', '$6.99', 13),
  ('Pancakes & More', 'Three Pieces Thick French Toast', 'Thick-cut homemade French toast.', '$6.99', 14),
  ('Pancakes & More', 'Three Buttermilk Pancakes', 'Three buttermilk pancakes.', '$6.99', 15),
  ('Pancakes & More', 'Short Stack', 'Two pancakes or two pieces of French toast, served with two extra large eggs.', '$6.99', 16),
  ('Pancakes & More', 'Three Blueberry Buttermilk Pancakes', 'Three buttermilk pancakes with blueberries.', '$7.99', 17),
  ('Pancakes & More', 'Three Chocolate Chip Buttermilk Pancakes', 'Three buttermilk pancakes with chocolate chips.', '$7.99', 18),
  ('Pancakes & More', 'Pigs In A Blanket', 'Three buttermilk pancakes filled with sausage links.', '$8.99', 19),
  ('Omelets', 'Smoked Slovenian Sausage Omelet', 'Slovenian sausage, sautéed onion, and green peppers topped with Swiss cheese.', '$10.99', 20),
  ('Omelets', 'Italian Omelet', 'Italian sausage, onions, peppers, mozzarella cheese, and marinara sauce.', '$10.99', 21),
  ('Omelets', 'Meatloaf Omelet', 'Sausage, bacon, ham, and cheddar cheese.', '$10.99', 22),
  ('Omelets', 'Corned Beef & Swiss Omelet', 'Sliced corned beef and Swiss cheese.', '$10.99', 23),
  ('Omelets', 'Hungarian Omelet', 'Homemade Hungarian sausage, sautéed onions, and paprika sauce.', '$10.99', 24),
  ('Omelets', 'Ham and Cheese Omelet', 'Smoked ham topped with cheddar cheese.', '$9.99', 25),
  ('Omelets', 'Mushroom and Cheese Omelet', 'Fresh mushrooms topped with cheddar cheese.', '$8.99', 26),
  ('Omelets', 'Cheese Omelet', 'Filled with cheddar cheese.', '$7.99', 27),
  ('Omelets', 'Spanish Omelet', 'Diced ham, onions, green peppers, tomatoes, salsa, and cheddar cheese.', '$10.49', 28),
  ('Omelets', 'Hot Spanish Omelet', 'Diced ham, onions, green peppers, tomatoes, jalapeño peppers, salsa, and cheddar cheese.', '$10.99', 29),
  ('Omelets', 'Bacon and Cheese Omelet', 'Crispy bacon topped with cheddar cheese.', '$9.99', 30),
  ('Omelets', 'Sausage and Cheese Omelet', 'Fresh sausage topped with cheddar cheese.', '$9.99', 31),
  ('Omelets', 'Western Omelet', 'Diced ham, onions, green peppers, and cheddar cheese.', '$10.49', 32),
  ('Omelets', 'Vegetable Omelet', 'Onions, mushrooms, green peppers, tomatoes, and cheddar cheese.', '$10.49', 33),
  ('Breakfast Sides', 'Smoked Slovenian Sausage', 'Breakfast side portion.', '$4.49', 40),
  ('Breakfast Sides', 'Corned Beef Hash', 'Breakfast side portion.', '$4.99', 41),
  ('Breakfast Sides', 'Homefries', 'Add sautéed onions or green peppers for 89¢.', '$2.99', 42),
  ('Breakfast Sides', 'Pancake or French Toast', 'One pancake or one piece of French toast.', '$2.69', 43),
  ('Breakfast Sides', 'Blueberry or Chocolate Chip Pancake', 'One specialty pancake.', '$2.99', 44),
  ('Breakfast Sides', 'Toast', 'White, wheat, rye, Italian, Paska with raisins, English muffin, or bagel with cream cheese.', '$1.99', 45),
  ('Breakfast Sides', 'Oatmeal', 'Add raisins, walnuts, or blueberries for 69¢ each.', '$3.69', 46),
  ('Breakfast Sides', 'Ham, Bacon, or Sausage', 'Ham, three strips of bacon, or three sausage links.', '$3.99', 47),
  ('Breakfast Sides', 'One Homemade Crêpe', 'One homemade crêpe.', '$4.29', 48),
  ('Lunch', 'Pork Schnitzel', 'Tenderized, lightly breaded pork loin fried golden brown, served with spaetzles.', '$14.99', 50),
  ('Lunch', 'Polish Platter', 'Three pieces of potato and cheese pierogies with sautéed onions, one piece of smoked Slovenian sausage, and cabbage and noodles.', '$15.99', 51),
  ('Lunch', 'Hungarian Chicken Paprikas', 'Chicken with spaetzles and covered with homemade paprika sauce.', '$14.99', 52),
  ('Lunch', 'Hungarian Platter', 'Choice of three chicken paprikas with spaetzles, stuffed cabbage, cabbage and noodles, or Slovenian sausage.', '$17.99', 53),
  ('Lunch', 'Stuffed Cabbage', 'Served with homemade red skin mashed potatoes or spaetzles.', '$14.99', 54),
  ('Lunch', 'Wienerschnitzel', 'Tenderized, lightly breaded veal fried golden brown, served with homemade mashed potatoes or spaetzles.', '$17.99', 55),
  ('Lunch', 'Open Face Turkey', 'Fresh roasted turkey covered with homemade beef brown sauce, served with mashed potatoes.', '$12.99', 56),
  ('Lunch', 'Meat Loaf', 'Homemade meatloaf topped with sautéed mushrooms covered with brown sauce, served with mashed potatoes.', '$12.99', 57),
  ('Lunch', 'Chicken Fingers', 'Lightly breaded tender chicken strips, deep fried and served with BBQ sauce and fries.', '$12.99', 58),
  ('Lunch', 'Grilled Liver-N-Onions', 'Generous portion of tender beef liver smothered with onions, served with mashed potatoes.', '$12.99', 59),
  ('Lunch', 'Spaghetti and Meatballs', 'Spaghetti covered with marinara sauce, served with homemade meatballs.', '$10.99', 60),
  ('Lunch', 'Veal Parmesan', 'Tenderized, lightly breaded veal, topped with mozzarella cheese and marinara sauce, served with spaghetti.', '$17.99', 61),
  ('Lunch', 'Chicken Parmesan', 'Tenderized, lightly breaded chicken breast, topped with mozzarella cheese and marinara sauce, served with spaghetti.', '$14.99', 62),
  ('Lunch', 'Alaskan Pollack Fish', 'Lightly breaded and fried to a golden brown, served with fries.', '$13.99', 63),
  ('Lunch', 'Breaded Shrimp or Clam Basket', 'Served with fries.', '$14.99', 64),
  ('Lunch', 'Alaskan Pollack Fish Platter', 'Alaskan Pollack fish, three potato and cheese pierogies, and cabbage and noodles.', '$16.99', 65),
  ('Sandwiches', 'Tuna Salad Melt', 'Tuna salad on grilled homemade thick Italian bread with American cheese and tomatoes.', '$11.99', 70),
  ('Sandwiches', 'Wienerschnitzel Sandwich', 'Tenderized, lightly breaded veal fried golden brown, served on homemade Italian bread.', '$15.99', 71),
  ('Sandwiches', 'Hamburger', 'Half-pound fresh-cut Angus ground beef patty, served on homemade bun.', '$11.99', 72),
  ('Sandwiches', 'Cheeseburger', 'Half-pound fresh-cut Angus ground beef with American or Swiss cheese, served on homemade bun.', '$12.99', 73),
  ('Sandwiches', 'Patty Melt', 'Half-pound fresh-cut Angus ground beef with sautéed onions and Swiss cheese, served on grilled rye bread.', '$12.99', 74),
  ('Sandwiches', 'Grilled Ham and Cheese', 'Grilled ham with melted American cheese, served on homemade thick Italian bread.', '$10.99', 75),
  ('Sandwiches', 'BLT', 'Freshly smoked bacon, lettuce, and vine-ripened tomato on homemade thick Italian bread.', '$10.99', 76),
  ('Sandwiches', 'Reuben', 'Fresh sliced corned beef, sauerkraut, and Swiss cheese on grilled rye bread.', '$13.99', 77),
  ('Sandwiches', 'Grilled Cheese', 'American cheese melted between homemade thick Italian bread.', '$8.99', 78),
  ('Sandwiches', 'Turkey Club', 'Fresh sliced turkey, bacon, lettuce, tomato, and mayo on toasted homemade thick Italian bread.', '$12.99', 79),
  ('Sandwiches', 'Turkey Sandwich', 'Fresh sliced turkey, lettuce, tomato, and mayo on toasted homemade thick Italian bread.', '$11.99', 80),
  ('Sandwiches', 'Gyro Wrap', 'Fresh strips of gyro, served in a tortilla wrap topped with fresh tomatoes, onions, and tzatziki sauce.', '$11.99', 81),
  ('Sandwiches', 'Alaskan Pollack Fish Sandwich', 'Lightly breaded and deep fried to a golden brown, served on homemade bun.', '$11.99', 82),
  ('Kids Menu', 'Two Pancakes or Two French Toast', 'Served with two strips of bacon or two sausage links.', '$6.99', 90),
  ('Kids Menu', 'One Egg with Meat', 'One egg, one strip of bacon, one sausage link, or ham, served with homefries and toast.', '$6.99', 91),
  ('Kids Menu', 'Chicken Fingers', 'Lightly breaded tender chicken strips, served with fries or apple sauce.', '$6.99', 92),
  ('Kids Menu', 'Grilled Cheese', 'Served with fries or apple sauce.', '$6.99', 93),
  ('Side Orders', 'Homemade Cabbage & Noodles', 'Homemade side order.', '$4.99', 100),
  ('Side Orders', 'Homemade Spaetzle with Chicken Paprikas Sauce', 'Homemade spaetzle with chicken paprikas sauce.', '$4.99', 101),
  ('Side Orders', 'Homemade Red Skin Mashed Potatoes', 'Homemade side order.', '$3.49', 102),
  ('Side Orders', 'Homemade Cucumber Salad or Red Cabbage', 'Choose cucumber salad or red cabbage.', '$3.99', 103),
  ('Side Orders', 'Fresh Cut Red Skin French Fries', 'Fresh cut fries.', '$3.49', 104),
  ('Side Orders', 'Homemade Bowl of Soup', 'Homemade soup of the day.', '$4.99', 105),
  ('Side Orders', 'Homemade Coleslaw', 'Homemade side order.', '$2.99', 106),
  ('Side Orders', 'Applesauce', 'Side order.', '$2.49', 107),
  ('Side Orders', 'Cottage Cheese', 'Side order.', '$2.99', 108),
  ('Side Orders', 'Sautéed Whole Green Beans', 'Side order.', '$3.49', 109),
  ('Beverages', 'Coffee or Hot Tea', 'Coffee or hot tea.', '$2.59', 120),
  ('Beverages', 'Soft Drinks', 'Pepsi, Diet Pepsi, Mt. Dew, Dr. Pepper, Sierra Mist, Root Beer, and Lemonade.', '$2.59', 121),
  ('Beverages', 'Fresh Brewed Unsweetened Iced Tea', 'Fresh brewed unsweetened iced tea.', '$2.99', 122),
  ('Beverages', 'Hot Chocolate', 'Hot chocolate.', '$2.59', 123),
  ('Beverages', 'Milk', 'Large $3.29 or small $2.59.', '$3.29 / $2.59', 124),
  ('Beverages', 'Chocolate Milk', 'Large $3.29 or small $2.59.', '$3.29 / $2.59', 125),
  ('Beverages', 'Juice', 'Orange, tomato, cranberry, or apple.', '$2.59', 126)
) AS seed(category, name, description, price, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items existing
  WHERE existing.category = seed.category AND existing.name = seed.name
);